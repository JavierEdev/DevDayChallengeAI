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

export interface IAgentLlmUsage {
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export interface IAgentLlmResult {
  text: string;
  model: string;
  usage?: IAgentLlmUsage;
}

export interface IAgentLlmPort {
  invoke(input: IAgentLlmInvocation): Promise<IAgentLlmResult>;
}
