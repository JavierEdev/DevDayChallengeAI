import {
  AIMessage,
  HumanMessage,
  SystemMessage,
  type BaseMessage
} from "@langchain/core/messages";

import type { IAgentLlmMessage } from "../../domain/agent/IAgentLlmPort.js";

export function toLangChainMessages(messages: IAgentLlmMessage[]): BaseMessage[] {
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

export function extractTextFromLlmContent(content: unknown): string {
  if (typeof content === "string") {
    return content;
  }

  if (!Array.isArray(content)) {
    return "";
  }

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
