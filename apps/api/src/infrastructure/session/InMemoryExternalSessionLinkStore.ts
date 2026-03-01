import type { IExternalSessionLinkStore } from "../../domain/session/IExternalSessionLinkStore.js";

export class InMemoryExternalSessionLinkStore implements IExternalSessionLinkStore {
  private readonly linksByExternalUserId = new Map<string, string>();
  private readonly preferredFlowIdByExternalUserId = new Map<string, string>();

  async getSessionIdByExternalUserId(externalUserId: string): Promise<string | null> {
    const sessionId = this.linksByExternalUserId.get(externalUserId);
    return sessionId ?? null;
  }

  async saveLink(externalUserId: string, sessionId: string): Promise<void> {
    this.linksByExternalUserId.set(externalUserId, sessionId);
  }

  async clearLink(externalUserId: string): Promise<void> {
    this.linksByExternalUserId.delete(externalUserId);
  }

  async getPreferredFlowIdByExternalUserId(externalUserId: string): Promise<string | null> {
    const flowId = this.preferredFlowIdByExternalUserId.get(externalUserId);
    return flowId ?? null;
  }

  async savePreferredFlowId(externalUserId: string, flowId: string): Promise<void> {
    this.preferredFlowIdByExternalUserId.set(externalUserId, flowId);
  }
}
