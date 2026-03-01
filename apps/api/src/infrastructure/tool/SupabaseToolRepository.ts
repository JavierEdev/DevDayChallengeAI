import type { SupabaseClient } from "@supabase/supabase-js";

import type { IToolDataset, IToolRepository, IToolRecord } from "../../domain/tool/IToolRepository.js";

interface IToolRecordRow {
  id: string;
  title: string;
  content: string;
  tags: string[] | null;
}

interface IToolDatasetRow {
  name: string;
  description: string;
  tool_records: IToolRecordRow[] | null;
}

export class SupabaseToolRepository implements IToolRepository {
  constructor(private readonly supabase: SupabaseClient) {}

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
}

