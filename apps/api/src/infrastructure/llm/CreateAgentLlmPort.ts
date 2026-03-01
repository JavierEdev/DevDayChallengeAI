import {
  AGENT_LLM_PROVIDERS,
  type AgentLlmProvider,
  type IAgentProviderFactory
} from "../../domain/agent/IAgentProviderFactory.js";
import type { IAgentLlmPort } from "../../domain/agent/IAgentLlmPort.js";
import type { ILangChainAgentLlmAdapterOptions } from "./LangChainGeminiLlmAdapter.js";
import { GeminiLlmProviderFactory } from "./GeminiLlmProviderFactory.js";

//Modelos obtenidos: https://ai.google.dev/gemini-api/docs/models
const DEFAULT_MODEL = "gemini-2.5-flash";
const DEFAULT_PROVIDER: AgentLlmProvider = "gemini";

export interface IAgentLlmEnvironment {
  AGENT_LLM_PROVIDER?: string;
  GOOGLE_API_KEY?: string;
  GEMINI_API_KEY?: string;
  AGENT_LLM_MODEL?: string;
  GOOGLE_BASE_URL?: string;
}

export function createAgentProviderFactoryFromEnv(
  env: IAgentLlmEnvironment
): IAgentProviderFactory {
  const provider = normalizeProvider(env.AGENT_LLM_PROVIDER);

  if (provider === "gemini") {
    return new GeminiLlmProviderFactory(buildGeminiOptions(env));
  }

  const available = AGENT_LLM_PROVIDERS.join(", ");
  throw new Error(`Unsupported AGENT_LLM_PROVIDER: ${provider}. Available: ${available}`);
}

export function createAgentLlmPortFromEnv(env: IAgentLlmEnvironment): IAgentLlmPort {
  return createAgentProviderFactoryFromEnv(env).createAgentLlmPort();
}

function buildGeminiOptions(env: IAgentLlmEnvironment): ILangChainAgentLlmAdapterOptions {
  const apiKey = env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY for agent LLM adapter.");
  }

  const options: ILangChainAgentLlmAdapterOptions = {
    apiKey,
    defaultModel: env.AGENT_LLM_MODEL ?? DEFAULT_MODEL
  };
  if (env.GOOGLE_BASE_URL) {
    options.baseUrl = env.GOOGLE_BASE_URL;
  }

  return options;
}

function normalizeProvider(providerFromEnv: string | undefined): AgentLlmProvider {
  if (!providerFromEnv) {
    return DEFAULT_PROVIDER;
  }

  const normalized = providerFromEnv.trim().toLowerCase();
  if (normalized === "google") {
    return "gemini";
  }

  if (normalized === "gemini") {
    return "gemini";
  }

  throw new Error(`Unsupported AGENT_LLM_PROVIDER: ${providerFromEnv}.`);
}
