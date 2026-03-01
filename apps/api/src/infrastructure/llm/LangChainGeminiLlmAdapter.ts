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

    if (this.options.baseUrl) {
      modelConfig.baseUrl = this.options.baseUrl;
    }

    const model = new ChatGoogleGenerativeAI(effectiveModel, modelConfig);
    const response = await model.invoke(toLangChainMessages(input.messages));

    const result: IAgentLlmResult = {
      text: extractTextFromLlmContent(response.content),
      model: effectiveModel
    };

    return result;
  }
}
