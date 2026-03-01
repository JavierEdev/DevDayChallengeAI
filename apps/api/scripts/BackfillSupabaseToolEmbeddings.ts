import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

import { createSupabaseClientFromEnv } from "../src/infrastructure/supabase/CreateSupabaseClient.js";

const DEFAULT_EMBEDDING_MODEL = "gemini-embedding-001";
const DEFAULT_BATCH_SIZE = 32;
const DEFAULT_OUTPUT_DIMENSIONS = 768;
const SUPPORTED_OUTPUT_DIMENSIONS = new Set([768, 1536, 3072]);

interface IBackfillEnvironment {
  GOOGLE_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_BASE_URL?: string;
  TOOL_EMBEDDING_BATCH_SIZE?: string;
  TOOL_EMBEDDING_DIMENSIONS?: string;
}

interface IToolRecordRow {
  id: string;
  title: string;
  content: string;
}

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);
const apiRootPath = resolve(currentDirectoryPath, "..");
dotenv.config({ path: resolve(apiRootPath, ".env") });

async function run(): Promise<void> {
  const env = process.env as IBackfillEnvironment;
  const apiKey = env.GEMINI_API_KEY?.trim() || env.GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY.");
  }

  const model = DEFAULT_EMBEDDING_MODEL;
  const batchSize = parseBatchSize(env.TOOL_EMBEDDING_BATCH_SIZE);
  const outputDimensions = parseOutputDimensions(env.TOOL_EMBEDDING_DIMENSIONS);
  const baseUrl = env.GOOGLE_BASE_URL?.trim();

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey,
    model,
    ...(baseUrl ? { baseUrl } : {})
  });

  const preflightVector = await preflightEmbedding(embeddings, model);
  if (preflightVector.length < outputDimensions) {
    throw new Error(
      `Embedding model "${model}" returned ${preflightVector.length} dimensions; output dimensions ${outputDimensions} is too large.`
    );
  }
  console.log(
    `Embedding preflight OK. model=${model}, sourceDimensions=${preflightVector.length}, outputDimensions=${outputDimensions}`
  );

  const supabase = createSupabaseClientFromEnv(process.env);
  const { data, error } = await supabase
    .from("tool_records")
    .select("id, title, content")
    .is("embedding", null)
    .order("id");

  if (error) {
    throw new Error(`Failed to load tool records without embeddings: ${error.message}`);
  }

  const records = (data ?? []) as IToolRecordRow[];
  if (records.length === 0) {
    console.log("No records pending embeddings. Backfill skipped.");
    return;
  }

  let processed = 0;
  let updated = 0;
  const skippedRecordIds: string[] = [];
  for (const chunk of chunkArray(records, batchSize)) {
    const inputs = chunk.map((record) => `${record.title}\n${record.content}`);
    const vectors = await embeddings.embedDocuments(inputs);

    for (let index = 0; index < chunk.length; index += 1) {
      const record = chunk[index];
      let vector = sanitizeVector(vectors[index]);

      if (!vector) {
        vector = await embedSingleSafely(embeddings, inputs[index]);
      }

      if (!vector) {
        skippedRecordIds.push(record.id);
        continue;
      }

      const projectedVector = projectVectorDimensions(vector, outputDimensions);
      const { error: updateError } = await supabase
        .from("tool_records")
        .update({
          embedding: toVectorLiteral(projectedVector),
          updated_at: new Date().toISOString()
        })
        .eq("id", record.id);

      if (updateError) {
        const maybeDimensionHint =
          updateError.message.toLowerCase().includes("dimension") ||
          updateError.message.toLowerCase().includes("vector")
            ? " Hint: run migration 0003_upgrade_embeddings_to_gemini_embedding_001.sql."
            : "";
        throw new Error(
          `Failed to update embedding for record "${record.id}": ${updateError.message}.${maybeDimensionHint}`
        );
      }

      updated += 1;
    }

    processed += chunk.length;
    console.log(`Embedded ${processed}/${records.length} tool records...`);
  }

  if (updated === 0 && records.length > 0) {
    throw new Error(
      `Backfill produced zero embeddings. Verify API key permissions and embedding model "${model}".`
    );
  }

  console.log(`Embedding backfill completed. total=${records.length}, updated=${updated}, model=${model}`);
  if (skippedRecordIds.length > 0) {
    console.warn(
      `Skipped ${skippedRecordIds.length} records due to invalid/empty vectors: ${skippedRecordIds.join(", ")}`
    );
  }
}

function parseBatchSize(rawValue: string | undefined): number {
  if (!rawValue) {
    return DEFAULT_BATCH_SIZE;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid TOOL_EMBEDDING_BATCH_SIZE value: ${rawValue}`);
  }

  return Math.floor(parsed);
}

function parseOutputDimensions(rawValue: string | undefined): number {
  if (!rawValue || rawValue.trim() === "") {
    return DEFAULT_OUTPUT_DIMENSIONS;
  }

  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid TOOL_EMBEDDING_DIMENSIONS value: ${rawValue}`);
  }

  const dimensions = Math.floor(parsed);
  if (!SUPPORTED_OUTPUT_DIMENSIONS.has(dimensions)) {
    throw new Error(
      `Unsupported TOOL_EMBEDDING_DIMENSIONS value: ${rawValue}. Use 768, 1536 or 3072.`
    );
  }

  return dimensions;
}

function toVectorLiteral(vector: number[]): string {
  return `[${vector.join(",")}]`;
}

function projectVectorDimensions(vector: number[], outputDimensions: number): number[] {
  if (vector.length === outputDimensions) {
    return vector;
  }

  if (vector.length < outputDimensions) {
    throw new Error(
      `Cannot project vector from ${vector.length} to ${outputDimensions} dimensions.`
    );
  }

  // MRL embeddings preserve useful information in the prefix.
  return vector.slice(0, outputDimensions);
}

async function embedSingleSafely(
  embeddings: GoogleGenerativeAIEmbeddings,
  input: string
): Promise<number[] | null> {
  try {
    const vector = await embeddings.embedQuery(input);
    return sanitizeVector(vector);
  } catch {
    return null;
  }
}

function sanitizeVector(vector: number[] | undefined): number[] | null {
  if (!Array.isArray(vector) || vector.length === 0) {
    return null;
  }

  if (vector.some((value) => !Number.isFinite(value))) {
    return null;
  }

  return vector;
}

async function preflightEmbedding(
  embeddings: GoogleGenerativeAIEmbeddings,
  model: string
): Promise<number[]> {
  try {
    const vector = await embeddings.embedQuery("Prueba de embedding para inicializar backfill");
    const sanitized = sanitizeVector(vector);
    if (!sanitized) {
      throw new Error(`Model "${model}" returned an empty/invalid vector in preflight.`);
    }

    return sanitized;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Embedding preflight failed for model "${model}": ${message}`);
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

run().catch((error) => {
  console.error("Failed to backfill Supabase embeddings", error);
  process.exitCode = 1;
});
