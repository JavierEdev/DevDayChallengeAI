import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage
} from "@langchain/core/messages";
import {
  ChatGoogleGenerativeAI,
  type GoogleGenerativeAIChatInput
} from "@langchain/google-genai";

import type {
  IAgentLlmInvocation,
  IAgentLlmMessage,
  IAgentLlmPort,
  IAgentLlmResult,
  IAgentLlmUsage
} from "../../domain/agent/IAgentLlmPort.js";

export interface ILangChainAgentLlmAdapterOptions {
  apiKey: string;
  defaultModel: string;
  baseUrl?: string;
  defaultTemperature?: number;
  defaultMaxTokens?: number;
}

export class LangChainGeminiLlmAdapter implements IAgentLlmPort {
  constructor(private readonly options: ILangChainAgentLlmAdapterOptions) {}

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

    if (this.options.baseUrl) {
      modelConfig.baseUrl = this.options.baseUrl;
    }

    const model = new ChatGoogleGenerativeAI(effectiveModel, modelConfig);

    const response = await model.invoke(this.toLangChainMessages(input.messages));
    const usage = this.extractUsage(response);

    const result: IAgentLlmResult = {
      text: this.extractText(response.content),
      model: effectiveModel
    };
    if (usage) {
      result.usage = usage;
    }

    return result;
  }

  private toLangChainMessages(messages: IAgentLlmMessage[]): BaseMessage[] {
    return messages.map((message) => {
      if (message.role === "system") {
        return new SystemMessage(message.content);
      }

      if (message.role === "assistant") {
        return new AIMessage(message.content);
      }

      return new HumanMessage(message.content);
    });
  }

  private extractText(content: unknown): string {
    if (typeof content === "string") {
      return content;
    }

    if (Array.isArray(content)) {
      return content
        .map((part) => {
          if (typeof part === "string") {
            return part;
          }

          if (typeof part === "object" && part && "text" in part) {
            const text = (part as { text?: unknown }).text;
            return typeof text === "string" ? text : "";
          }

          return "";
        })
        .filter(Boolean)
        .join("\n");
    }

    return "";
  }

  private extractUsage(response: unknown): IAgentLlmUsage | undefined {
    if (!response || typeof response !== "object") {
      return undefined;
    }

    const usageMetadata = (response as { usage_metadata?: unknown }).usage_metadata;
    if (usageMetadata && typeof usageMetadata === "object") {
      const candidate = usageMetadata as Record<string, unknown>;
      const inputTokens =
        this.toNumber(candidate.input_tokens) ??
        this.toNumber(candidate.prompt_tokens) ??
        this.toNumber(candidate.promptTokens);
      const outputTokens =
        this.toNumber(candidate.output_tokens) ??
        this.toNumber(candidate.completion_tokens) ??
        this.toNumber(candidate.completionTokens);
      const totalTokens =
        this.toNumber(candidate.total_tokens) ??
        this.toNumber(candidate.totalTokens);

      return this.buildUsage(inputTokens, outputTokens, totalTokens);
    }

    const responseMetadata = (response as { response_metadata?: unknown }).response_metadata;
    if (responseMetadata && typeof responseMetadata === "object") {
      const tokenUsage = (responseMetadata as { tokenUsage?: unknown }).tokenUsage;
      if (tokenUsage && typeof tokenUsage === "object") {
        const candidate = tokenUsage as Record<string, unknown>;
        return this.buildUsage(
          this.toNumber(candidate.promptTokens) ??
            this.toNumber(candidate.inputTokens),
          this.toNumber(candidate.completionTokens) ??
            this.toNumber(candidate.outputTokens),
          this.toNumber(candidate.totalTokens)
        );
      }
    }

    return undefined;
  }

  private buildUsage(
    inputTokens: number | undefined,
    outputTokens: number | undefined,
    totalTokens: number | undefined
  ): IAgentLlmUsage | undefined {
    const usage: IAgentLlmUsage = {};
    if (inputTokens !== undefined) {
      usage.inputTokens = inputTokens;
    }
    if (outputTokens !== undefined) {
      usage.outputTokens = outputTokens;
    }
    if (totalTokens !== undefined) {
      usage.totalTokens = totalTokens;
    }

    return Object.keys(usage).length > 0 ? usage : undefined;
  }

  private toNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  }
}
