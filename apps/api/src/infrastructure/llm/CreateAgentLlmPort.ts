import type { IAgentLlmPort } from "../../domain/agent/IAgentLlmPort.js";
import {
  LangChainGeminiLlmAdapter,
  type ILangChainGeminiLlmAdapterOptions
} from "./LangChainGeminiLlmAdapter.js";

const DEFAULT_MODEL = "gemini-3-flash";
const DEFAULT_MAX_RETRIES = 0;
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;

export interface IAgentLlmEnvironment {
  AGENT_LLM_MODEL?: string;
  GOOGLE_API_KEY?: string;
  GEMINI_API_KEY?: string;
  GOOGLE_BASE_URL?: string;
  AGENT_LLM_MAX_RETRIES?: string;
  AGENT_LLM_REQUEST_TIMEOUT_MS?: string;
}

export function createAgentLlmPortFromEnv(env: IAgentLlmEnvironment): IAgentLlmPort {
  const apiKey = env.GEMINI_API_KEY ?? env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY or GOOGLE_API_KEY for Gemini provider.");
  }

  const defaultModel = env.AGENT_LLM_MODEL?.trim() || DEFAULT_MODEL;
  const options: ILangChainGeminiLlmAdapterOptions = {
    apiKey,
    defaultModel,
    maxRetries: parseOptionalNonNegativeInteger(env.AGENT_LLM_MAX_RETRIES) ?? DEFAULT_MAX_RETRIES,
    requestTimeoutMs:
      parseOptionalPositiveInteger(env.AGENT_LLM_REQUEST_TIMEOUT_MS) ?? DEFAULT_REQUEST_TIMEOUT_MS
  };

  const baseUrl = env.GOOGLE_BASE_URL?.trim();
  if (baseUrl) {
    options.baseUrl = baseUrl;
  }

  return new LangChainGeminiLlmAdapter(options);
}

function parseOptionalNonNegativeInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }

  const normalized = Math.trunc(parsed);
  if (normalized < 0) {
    throw new Error(`Invalid non-negative integer value: ${value}`);
  }

  return normalized;
}

function parseOptionalPositiveInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`Invalid integer value: ${value}`);
  }

  const normalized = Math.trunc(parsed);
  if (normalized <= 0) {
    throw new Error(`Invalid positive integer value: ${value}`);
  }

  return normalized;
}
