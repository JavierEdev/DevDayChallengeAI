import type { IAgentLlmPort } from "../../domain/agent/IAgentLlmPort.js";
import {
  LangChainGeminiLlmAdapter,
  type ILangChainGeminiLlmAdapterOptions
} from "./LangChainGeminiLlmAdapter.js";

const DEFAULT_MODEL = "gemini-2.5-flash";

export interface IAgentLlmEnvironment {
  AGENT_LLM_MODEL?: string;
  GOOGLE_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_BASE_URL?: string;
}

export function createAgentLlmPortFromEnv(env: IAgentLlmEnvironment): IAgentLlmPort {
  const apiKey = env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY for Gemini provider.");
  }

  const defaultModel = env.AGENT_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const options: ILangChainGeminiLlmAdapterOptions = {
    apiKey,
    defaultModel
  };

  const baseUrl = env.GOOGLE_BASE_URL?.trim();
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new LangChainGeminiLlmAdapter(options);
}
