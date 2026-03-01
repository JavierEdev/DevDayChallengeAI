import type { IExternalSessionLinkStore } from "../../domain/session/IExternalSessionLinkStore.js";

export class InMemoryExternalSessionLinkStore implements IExternalSessionLinkStore {
  private readonly linksByExternalUserId = new Map<string, string>();

  async getSessionIdByExternalUserId(externalUserId: string): Promise<string | null> {
    const sessionId = this.linksByExternalUserId.get(externalUserId);
    return sessionId ?? null;
  }

  async saveLink(externalUserId: string, sessionId: string): Promise<void> {
    this.linksByExternalUserId.set(externalUserId, sessionId);
  }
}
