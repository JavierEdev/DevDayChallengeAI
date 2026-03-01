export type AgentLlmRole = "system" | "user" | "assistant";

export interface IAgentLlmMessage {
  role: AgentLlmRole;
  content: string;
}

export interface IAgentLlmInvocation {
  messages: IAgentLlmMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface IAgentLlmResult {
  text: string;
  model: string;
}

export interface IAgentLlmPort {
  invoke(input: IAgentLlmInvocation): Promise<IAgentLlmResult>;
}
