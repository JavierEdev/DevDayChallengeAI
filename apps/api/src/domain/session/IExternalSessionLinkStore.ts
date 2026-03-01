export interface IExternalSessionLinkStore {
  getSessionIdByExternalUserId(externalUserId: string): Promise<string | null>;
  saveLink(externalUserId: string, sessionId: string): Promise<void>;
}
