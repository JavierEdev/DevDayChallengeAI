import type { SessionState } from "@devday/shared";

export interface ISessionStateStore {
  create(sessionState: SessionState): Promise<void>;
  getById(sessionId: string): Promise<SessionState | null>;
  update(sessionState: SessionState): Promise<void>;
}
