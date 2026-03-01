import {
  ChatGoogleGenerativeAI,
  type GoogleGenerativeAIChatInput
} from "@langchain/google-genai";

import type {
  IAgentLlmInvocation,
  IAgentLlmPort,
  IAgentLlmResult
} from "../../domain/agent/IAgentLlmPort.js";
import {
  extractTextFromLlmContent,
  toLangChainMessages
} from "./LangChainLlmAdapterUtils.js";

export interface ILangChainGeminiLlmAdapterOptions {
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
  maxRetries?: number;
  requestTimeoutMs?: number;
}

export class LangChainGeminiLlmAdapter implements IAgentLlmPort {
  constructor(private readonly options: ILangChainGeminiLlmAdapterOptions) {}

  async invoke(input: IAgentLlmInvocation): Promise<IAgentLlmResult> {
    const effectiveModel = input.model ?? this.options.defaultModel;
    const modelConfig: Omit<GoogleGenerativeAIChatInput, "model"> = {
      apiKey: this.options.apiKey
    };

    const effectiveTemperature = input.temperature ?? this.options.defaultTemperature;
    if (effectiveTemperature !== undefined) {
      modelConfig.temperature = effectiveTemperature;
    }

    const effectiveMaxTokens = input.maxTokens ?? this.options.defaultMaxTokens;
    if (effectiveMaxTokens !== undefined) {
      modelConfig.maxOutputTokens = effectiveMaxTokens;
    }

    if (this.options.maxRetries !== undefined) {
      modelConfig.maxRetries = this.options.maxRetries;
    }

    if (this.options.baseUrl) {
      modelConfig.baseUrl = this.options.baseUrl;
    }

    const model = new ChatGoogleGenerativeAI(effectiveModel, modelConfig);
    const primaryMessages = this.sanitizeMessages(input.messages);
    let response: Awaited<ReturnType<typeof model.invoke>>;

    try {
      response = await this.invokeModel(model, primaryMessages);
    } catch (error) {
      if (!this.shouldRetryWithReducedContext(error)) {
        throw error;
      }

      const fallbackMessages = this.reduceMessagesForRetry(primaryMessages);
      response = await this.invokeModel(model, fallbackMessages);
    }

    const extractedText = extractTextFromLlmContent(response.content).trim();
    const text =
      extractedText.length > 0
        ? extractedText
        : "No pude generar una respuesta en este momento. Intenta nuevamente.";

    return {
      text,
      model: effectiveModel
    };
  }

  private sanitizeMessages(messages: IAgentLlmInvocation["messages"]): IAgentLlmInvocation["messages"] {
    const normalized = messages
      .map((message) => ({
        role: message.role,
        content: message.content?.trim() ?? ""
      }))
      .filter((message) => message.content.length > 0);

    return normalized.length > 0
      ? normalized
      : [
          {
            role: "user",
            content: "Hola"
          }
        ];
  }

  private shouldRetryWithReducedContext(error: unknown): boolean {
    if (!(error instanceof Error)) {
      return false;
    }

    const message = error.message.toLowerCase();
    return message.includes("reading 'parts'") || message.includes("reading \"parts\"");
  }

  private reduceMessagesForRetry(
    messages: IAgentLlmInvocation["messages"]
  ): IAgentLlmInvocation["messages"] {
    const systemMessages = messages.filter((message) => message.role === "system").slice(0, 1);
    const nonSystemMessages = messages.filter((message) => message.role !== "system").slice(-6);
    const fallback = [...systemMessages, ...nonSystemMessages];

    return fallback.length > 0
      ? fallback
      : [
          {
            role: "user",
            content: "Hola"
          }
        ];
  }

  private async invokeModel(
    model: ChatGoogleGenerativeAI,
    messages: IAgentLlmInvocation["messages"]
  ): Promise<Awaited<ReturnType<typeof model.invoke>>> {
    if (this.options.requestTimeoutMs === undefined) {
      return model.invoke(toLangChainMessages(messages));
    }

    const configuredModel = model.withConfig({
      timeout: this.options.requestTimeoutMs
    });
    return configuredModel.invoke(toLangChainMessages(messages));
  }
}
