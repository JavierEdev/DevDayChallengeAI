import type { SupabaseClient } from "@supabase/supabase-js";
import type { SessionState } from "@devday/shared";

import type { ISessionStateStore } from "../../domain/session/ISessionStateStore.js";

interface ISessionRow {
  id: string;
  state: SessionState;
}

export class SupabaseSessionStateStore implements ISessionStateStore {
  constructor(private readonly supabase: SupabaseClient) {}

  async create(sessionState: SessionState): Promise<void> {
    const { error } = await this.supabase.from("sessions").insert({
      id: sessionState.id,
      flow_id: sessionState.flowId,
      status: sessionState.status,
      state: sessionState,
      created_at: sessionState.createdAt,
      updated_at: sessionState.updatedAt
    });

    if (error) {
      throw new Error(`Failed to create session "${sessionState.id}": ${error.message}`);
    }
  }

  async getById(sessionId: string): Promise<SessionState | null> {
    const { data, error } = await this.supabase
      .from("sessions")
      .select("id, state")
      .eq("id", sessionId)
      .maybeSingle<ISessionRow>();

    if (error) {
      throw new Error(`Failed to load session "${sessionId}": ${error.message}`);
    }

    if (!data) {
      return null;
    }

    return structuredClone(data.state);
  }

  async update(sessionState: SessionState): Promise<void> {
    const { error } = await this.supabase
      .from("sessions")
      .update({
        flow_id: sessionState.flowId,
        status: sessionState.status,
        state: sessionState,
        updated_at: sessionState.updatedAt
      })
      .eq("id", sessionState.id);

    if (error) {
      throw new Error(`Failed to update session "${sessionState.id}": ${error.message}`);
    }
  }
}

