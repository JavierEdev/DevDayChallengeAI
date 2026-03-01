export interface IExternalSessionLinkStore {
  getSessionIdByExternalUserId(externalUserId: string): Promise<string | null>;
  saveLink(externalUserId: string, sessionId: string): Promise<void>;
  clearLink(externalUserId: string): Promise<void>;
  getPreferredFlowIdByExternalUserId(externalUserId: string): Promise<string | null>;
  savePreferredFlowId(externalUserId: string, flowId: string): Promise<void>;
}
