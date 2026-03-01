import type { SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

import type {
  IToolDataset,
  IToolRepository,
  IToolRecord,
  IToolSemanticMatch,
  IToolSemanticSearchInput
} from "../../domain/tool/IToolRepository.js";

const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const DEFAULT_EMBEDDING_DIMENSIONS = 768;
const SUPPORTED_EMBEDDING_DIMENSIONS = new Set([768, 1536, 3072]);

interface IToolRecordRow {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
}

interface IToolSemanticMatchRow extends IToolRecordRow {
  dataset_name: string;
  similarity: number | null;
}

interface IToolDatasetRow {
  name: string;
  description: string;
  tool_records: IToolRecordRow[] | null;
}

export interface ISupabaseToolRepositoryOptions {
  geminiApiKey?: string;
  googleApiKey?: string;
  googleBaseUrl?: string;
  embeddingModel?: string;
  embeddingDimensions?: number;
}

export class SupabaseToolRepository implements IToolRepository {
  private readonly embeddings: GoogleGenerativeAIEmbeddings | null;
  private readonly embeddingDimensions: number;

  constructor(
    private readonly supabase: SupabaseClient,
    options: ISupabaseToolRepositoryOptions = {}
  ) {
    this.embeddingDimensions = resolveEmbeddingDimensions(options.embeddingDimensions);
    const apiKey = options.geminiApiKey?.trim() || options.googleApiKey?.trim();
    if (!apiKey) {
      this.embeddings = null;
      return;
    }

    const embeddingModel = options.embeddingModel?.trim() || DEFAULT_EMBEDDING_MODEL;
    const googleBaseUrl = options.googleBaseUrl?.trim();
    this.embeddings = new GoogleGenerativeAIEmbeddings({
      apiKey,
      model: embeddingModel,
      ...(googleBaseUrl ? { baseUrl: googleBaseUrl } : {})
    });
  }

  async listDatasets(): Promise<IToolDataset[]> {
    const { data, error } = await this.supabase
      .from("tool_datasets")
      .select("name, description, tool_records(id, title, content, tags)")
      .order("name");

    if (error) {
      throw new Error(`Failed to list tool datasets: ${error.message}`);
    }

    const rows = (data ?? []) as IToolDatasetRow[];
    return rows.map((row) => this.mapDataset(row));
  }

  async getDatasetByName(name: string): Promise<IToolDataset | null> {
    const { data, error } = await this.supabase
      .from("tool_datasets")
      .select("name, description, tool_records(id, title, content, tags)")
      .eq("name", name)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to load tool dataset "${name}": ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return this.mapDataset(data as IToolDatasetRow);
  }

  async searchSimilarRecords(input: IToolSemanticSearchInput): Promise<IToolSemanticMatch[]> {
    const query = input.query.trim();
    if (!query || !this.embeddings) {
      return [];
    }

    const limit = Math.max(1, input.limit ?? 5);
    const queryEmbedding = await this.embedAndProjectQuery(query);

    const { data, error } = await this.supabase.rpc("match_tool_records", {
      query_embedding: toVectorLiteral(queryEmbedding),
      match_count: limit,
      dataset_filter: input.datasetName ?? null
    });

    if (error) {
      throw new Error(`Failed to run semantic tool retrieval: ${error.message}`);
    }

    const rows = (data ?? []) as IToolSemanticMatchRow[];
    return rows.map((row) => this.mapSemanticMatch(row));
  }

  private mapDataset(row: IToolDatasetRow): IToolDataset {
    return {
      name: row.name,
      description: row.description,
      records: (row.tool_records ?? []).map((record) => this.mapRecord(record))
    };
  }

  private mapRecord(row: IToolRecordRow): IToolRecord {
    const mapped: IToolRecord = {
      id: row.id,
      title: row.title,
      content: row.content
    };

    if (Array.isArray(row.tags) && row.tags.length > 0) {
      mapped.tags = row.tags;
    }

    return mapped;
  }

  private mapSemanticMatch(row: IToolSemanticMatchRow): IToolSemanticMatch {
    const baseRecord = this.mapRecord(row);
    return {
      ...baseRecord,
      datasetName: row.dataset_name,
      similarity: row.similarity ?? 0
    };
  }

  private async embedAndProjectQuery(query: string): Promise<number[]> {
    try {
      const vector = await this.embeddings!.embedQuery(query);
      return projectVector(vector, this.embeddingDimensions);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Failed to embed semantic query: ${message}`);
    }
  }
}

function resolveEmbeddingDimensions(value: number | undefined): number {
  const dimensions = value ?? DEFAULT_EMBEDDING_DIMENSIONS;
  if (!SUPPORTED_EMBEDDING_DIMENSIONS.has(dimensions)) {
    throw new Error(
      `Unsupported embeddingDimensions value "${dimensions}". Use 768, 1536, or 3072.`
    );
  }

  return dimensions;
}

function projectVector(vector: number[], outputDimensions: number): number[] {
  if (!Array.isArray(vector) || vector.length === 0) {
    throw new Error("Embedding provider returned empty vector.");
  }

  if (vector.some((value) => !Number.isFinite(value))) {
    throw new Error("Embedding provider returned invalid numeric values.");
  }

  if (vector.length < outputDimensions) {
    throw new Error(
      `Embedding provider returned ${vector.length} dimensions; expected at least ${outputDimensions}.`
    );
  }

  return vector.slice(0, outputDimensions);
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}
