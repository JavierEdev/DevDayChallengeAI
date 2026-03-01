import type { IAgentProviderFactory } from "../../domain/agent/IAgentProviderFactory.js";
import type { IAgentLlmPort } from "../../domain/agent/IAgentLlmPort.js";
import {
  LangChainGeminiLlmAdapter,
  type ILangChainAgentLlmAdapterOptions
} from "./LangChainGeminiLlmAdapter.js";

export class GeminiLlmProviderFactory implements IAgentProviderFactory {
  readonly provider = "gemini" as const;

  constructor(private readonly options: ILangChainAgentLlmAdapterOptions) {}

  createAgentLlmPort(): IAgentLlmPort {
    return new LangChainGeminiLlmAdapter(this.options);
  }
}
