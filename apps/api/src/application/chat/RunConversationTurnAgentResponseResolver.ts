import type { AgentNodeData, FlowDefinition, SessionState } from "@devday/shared";

import type { IAgentLlmResult } from "../../domain/agent/IAgentLlmPort.js";
import type { IToolDataset } from "../../domain/tool/IToolRepository.js";
import type { RunConversationTurnAgentComposer } from "./RunConversationTurnAgentComposer.js";

type AgentLlmInvoker = (
  agentNodeData: { model?: string; temperature?: number },
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>
) => Promise<IAgentLlmResult | null>;

export interface IResolveAgentNodeResponseInput {
  userMessage: string;
  flowDefinition: FlowDefinition;
  sessionState: SessionState;
  agentNodeData: AgentNodeData;
  agentRole: "specialist" | "generic";
  agentRuntimeDatasets: IToolDataset[];
}

export class RunConversationTurnAgentResponseResolver {
  constructor(
    private readonly useAgentLlm: boolean,
    private readonly agentComposer: RunConversationTurnAgentComposer,
    private readonly invokeAgentNodeLlm: AgentLlmInvoker
  ) {}

  async resolve(input: IResolveAgentNodeResponseInput): Promise<IAgentLlmResult> {
    return input.agentRole === "specialist"
      ? this.resolveSpecialistAgentResponse(input)
      : this.resolveGenericAgentResponse(input);
  }

  private async resolveSpecialistAgentResponse(
    input: IResolveAgentNodeResponseInput
  ): Promise<IAgentLlmResult> {
    const directSpecialistResponse = this.agentComposer.tryBuildDirectToolResponse(
      input.userMessage,
      input.agentRuntimeDatasets,
      input.sessionState.variables
    );

    if (directSpecialistResponse) {
      if (!this.useAgentLlm) {
        return {
          text: directSpecialistResponse,
          model: "specialist-direct"
        };
      }

      const polishMessages = this.agentComposer.buildSpecialistPolishMessages({
        userMessage: input.userMessage,
        agentInstructions: input.agentNodeData.instructions,
        rawJsonResponse: directSpecialistResponse,
        variables: input.sessionState.variables
      });
      const polishedResponse = await this.invokeAgentNodeLlm(input.agentNodeData, polishMessages);
      if (polishedResponse) {
        return polishedResponse;
      }

      return {
        text: directSpecialistResponse,
        model: "specialist-json-fallback"
      };
    }

    if (this.useAgentLlm) {
      const llmMessages = this.agentComposer.buildLlmMessages(
        input.sessionState,
        input.flowDefinition,
        input.agentNodeData,
        input.agentRuntimeDatasets
      );
      const llmResponse = await this.invokeAgentNodeLlm(input.agentNodeData, llmMessages);
      if (llmResponse) {
        return llmResponse;
      }
    }

    return {
      text: this.agentComposer.buildSpecialistFallbackResponse(),
      model: "specialist-fallback"
    };
  }

  private async resolveGenericAgentResponse(
    input: IResolveAgentNodeResponseInput
  ): Promise<IAgentLlmResult> {
    if (this.useAgentLlm) {
      const llmMessages = this.agentComposer.buildLlmMessages(
        input.sessionState,
        input.flowDefinition,
        input.agentNodeData,
        input.agentRuntimeDatasets
      );
      const llmResponse = await this.invokeAgentNodeLlm(input.agentNodeData, llmMessages);
      if (llmResponse) {
        return llmResponse;
      }
    }

    return {
      text: this.agentComposer.buildGenericFallbackResponse(input.userMessage),
      model: "generic-fallback"
    };
  }
}
