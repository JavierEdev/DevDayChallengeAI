import type { SupabaseClient } from "@supabase/supabase-js";
import type { FlowDefinition } from "@devday/shared";

import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";

interface IFlowRow {
  id: string;
  definition: FlowDefinition;
}

export class SupabaseFlowRepository implements IFlowRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(flowDefinition: FlowDefinition): Promise<void> {
    const { error } = await this.supabase.from("flows").insert({
      id: flowDefinition.id,
      name: flowDefinition.name,
      description: flowDefinition.description,
      version: flowDefinition.version,
      definition: flowDefinition,
      created_at: flowDefinition.createdAt,
      updated_at: flowDefinition.updatedAt
    });

    if (error) {
      throw new Error(`Failed to create flow "${flowDefinition.id}": ${error.message}`);
    }
  }

  async getById(flowId: string): Promise<FlowDefinition | null> {
    const { data, error } = await this.supabase
      .from("flows")
      .select("id, definition")
      .eq("id", flowId)
      .maybeSingle<IFlowRow>();

    if (error) {
      throw new Error(`Failed to load flow "${flowId}": ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return structuredClone(data.definition);
  }

  async update(flowDefinition: FlowDefinition): Promise<void> {
    const { error } = await this.supabase
      .from("flows")
      .update({
        name: flowDefinition.name,
        description: flowDefinition.description,
        version: flowDefinition.version,
        definition: flowDefinition,
        updated_at: flowDefinition.updatedAt
      })
      .eq("id", flowDefinition.id);

    if (error) {
      throw new Error(`Failed to update flow "${flowDefinition.id}": ${error.message}`);
    }
  }

  async deleteById(flowId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from("flows")
      .delete()
      .eq("id", flowId)
      .select("id");

    if (error) {
      throw new Error(`Failed to delete flow "${flowId}": ${error.message}`);
    }

    return Array.isArray(data) && data.length > 0;
  }
}

