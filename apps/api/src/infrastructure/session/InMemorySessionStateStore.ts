import type { SessionState } from "@devday/shared";

import type { ISessionStateStore } from "../../domain/session/ISessionStateStore.js";

export class InMemorySessionStateStore implements ISessionStateStore {
  private readonly sessions = new Map<string, SessionState>();

  async create(sessionState: SessionState): Promise<void> {
    this.sessions.set(sessionState.id, this.clone(sessionState));
  }

  async getById(sessionId: string): Promise<SessionState | null> {
    const sessionState = this.sessions.get(sessionId);
    return sessionState ? this.clone(sessionState) : null;
  }

  async update(sessionState: SessionState): Promise<void> {
    this.sessions.set(sessionState.id, this.clone(sessionState));
  }

  private clone<TValue>(value: TValue): TValue {
    return structuredClone(value);
  }
}
