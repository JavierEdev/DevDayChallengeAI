import type { IAgentLlmPort } from "./IAgentLlmPort.js";

export const AGENT_LLM_PROVIDERS = ["gemini"] as const;
export type AgentLlmProvider = (typeof AGENT_LLM_PROVIDERS)[number];

export interface IAgentProviderFactory {
  readonly provider: AgentLlmProvider;
  createAgentLlmPort(): IAgentLlmPort;
}
