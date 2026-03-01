import { randomUUID } from "node:crypto";

import type {
  FlowDefinition,
  SendMessageRequest,
  SendMessageResponse,
  SessionMessage,
  SessionState,
  TraceEvent
} from "@devday/shared";

import type { IAgentLlmMessage } from "../../domain/agent/IAgentLlmPort.js";
import type { IToolDataset } from "../../domain/tool/IToolRepository.js";
import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";
import { SessionNotFoundError } from "../errors/SessionNotFoundError.js";
import type { IRunConversationTurnUseCaseDependencies } from "./IRunConversationTurnUseCaseDependencies.js";

const MAX_TOOL_CONTEXT_RECORDS = 3;
const MAX_MESSAGE_HISTORY = 12;

export class RunConversationTurnUseCase {
  constructor(private readonly dependencies: IRunConversationTurnUseCaseDependencies) {}

  async execute(input: SendMessageRequest): Promise<SendMessageResponse> {
    const sessionState = await this.dependencies.sessionStateStore.getById(input.sessionId);
    if (!sessionState) {
      throw new SessionNotFoundError(input.sessionId);
    }
    const flowDefinition = await this.dependencies.flowRepository.getById(sessionState.flowId);
    if (!flowDefinition) {
      throw new FlowNotFoundError(sessionState.flowId);
    }
    const activeNodeId = this.resolveActiveNodeId(sessionState, flowDefinition);

    const traceEvents: TraceEvent[] = [];
    const userMessageTimestamp = this.nowIso();
    const userMessage: SessionMessage = {
      id: this.newId(),
      role: "user",
      content: input.message,
      createdAt: userMessageTimestamp
    };
    if (input.metadata) {
      userMessage.metadata = input.metadata;
    }

    sessionState.messages.push(userMessage);
    sessionState.status = "running";
    sessionState.updatedAt = userMessageTimestamp;
    sessionState.execution.stepCount += 1;
    sessionState.execution.currentNodeId = activeNodeId;
    sessionState.execution.updatedAt = userMessageTimestamp;
    if (!sessionState.execution.visitedNodeIds.includes(activeNodeId)) {
      sessionState.execution.visitedNodeIds.push(activeNodeId);
    }

    traceEvents.push(
      this.createTraceEvent(sessionState.id, "message_received", userMessageTimestamp, {
        message: "Mensaje del usuario procesado"
      }),
      this.createTraceEvent(sessionState.id, "node_entered", userMessageTimestamp, {
        nodeId: activeNodeId,
        message: "Nodo activo del flujo analizando intencion"
      })
    );

    const datasets = await this.dependencies.toolRepository.listDatasets();
    const toolContext = this.buildToolContext(datasets);
    if (toolContext.length > 0) {
      traceEvents.push(
        this.createTraceEvent(
          sessionState.id,
          "tool_called",
          this.nowIso(),
          {
            message: "Contexto de JSON estatico inyectado en el prompt",
            payload: { datasets: datasets.map((dataset) => dataset.name) }
          }
        )
      );
    }

    const llmMessages = this.buildLlmMessages(sessionState, flowDefinition, toolContext);
    const llmResult = await this.dependencies.agentLlmPort.invoke({
      messages: llmMessages
    });

    const assistantTimestamp = this.nowIso();
    const assistantMessage: SessionMessage = {
      id: this.newId(),
      role: "assistant",
      content: llmResult.text,
      createdAt: assistantTimestamp,
      metadata: {
        model: llmResult.model,
        usage: llmResult.usage
      }
    };

    sessionState.messages.push(assistantMessage);
    sessionState.status = "waiting_input";
    sessionState.updatedAt = assistantTimestamp;
    const nextNodeId = this.resolveNextNodeId(flowDefinition, activeNodeId);
    sessionState.execution.nextNodeId = nextNodeId ?? "waiting_user_input";
    sessionState.execution.updatedAt = assistantTimestamp;

    traceEvents.push(
      this.createTraceEvent(sessionState.id, "agent_responded", assistantTimestamp, {
        nodeId: activeNodeId,
        message: "El agente genero una respuesta",
        payload: { model: llmResult.model }
      }),
      this.createTraceEvent(sessionState.id, "response_generated", assistantTimestamp, {
        message: "Mensaje del asistente enviado al cliente"
      }),
      this.createTraceEvent(sessionState.id, "node_completed", assistantTimestamp, {
        nodeId: activeNodeId,
        message: "Turno de conversacion completado"
      })
    );

    await this.dependencies.sessionStateStore.update(sessionState);

    return {
      session: sessionState,
      status: sessionState.status,
      trace: traceEvents,
      assistantMessage
    };
  }

  private buildLlmMessages(
    sessionState: SessionState,
    flowDefinition: FlowDefinition,
    toolContext: string
  ): IAgentLlmMessage[] {
    const messages: IAgentLlmMessage[] = [];
    messages.push({
      role: "system",
      content: this.buildSystemPrompt(flowDefinition, toolContext)
    });

    const recentMessages = sessionState.messages.slice(-MAX_MESSAGE_HISTORY);
    for (const message of recentMessages) {
      messages.push({
        role: message.role,
        content: message.content
      });
    }

    return messages;
  }

  private buildSystemPrompt(flowDefinition: FlowDefinition, toolContext: string): string {
    const agentInstructions = this.extractAgentInstructions(flowDefinition);
    const responseTemplate = this.extractResponseTemplate(flowDefinition);
    const basePrompt = [
      "Eres un asistente de una concesionaria de autos.",
      "Responde siempre en espanol neutro, de forma clara y breve.",
      "Usa solo la informacion disponible en el contexto y en el historial de mensajes.",
      "Si falta informacion, haz una pregunta de seguimiento concreta.",
      `Flujo actual: ${flowDefinition.name}.`
    ].join(" ");

    const promptSections: string[] = [basePrompt];
    if (agentInstructions) {
      promptSections.push(`Instrucciones del agente: ${agentInstructions}`);
    }
    if (responseTemplate) {
      promptSections.push(`Plantilla de respuesta sugerida: ${responseTemplate}`);
    }
    if (toolContext) {
      promptSections.push(`Contexto de negocio:\n${toolContext}`);
    }

    return promptSections.join("\n\n");
  }

  private buildToolContext(datasets: IToolDataset[]): string {
    const lines: string[] = [];
    for (const dataset of datasets) {
      lines.push(`[${dataset.name}] ${dataset.description}`);
      for (const record of dataset.records.slice(0, MAX_TOOL_CONTEXT_RECORDS)) {
        lines.push(`- ${record.title}: ${record.content}`);
      }
    }

    return lines.join("\n");
  }

  private resolveActiveNodeId(sessionState: SessionState, flowDefinition: FlowDefinition): string {
    const nodeIds = new Set(flowDefinition.nodes.map((node) => node.id));
    if (sessionState.execution.nextNodeId && nodeIds.has(sessionState.execution.nextNodeId)) {
      return sessionState.execution.nextNodeId;
    }

    const firstAgentNode = flowDefinition.nodes.find((node) => node.type === "agent");
    if (firstAgentNode) {
      return firstAgentNode.id;
    }

    return flowDefinition.startNodeId;
  }

  private resolveNextNodeId(flowDefinition: FlowDefinition, currentNodeId: string): string | null {
    const nextEdge = flowDefinition.edges.find((edge) => edge.source === currentNodeId);
    return nextEdge?.target ?? null;
  }

  private extractAgentInstructions(flowDefinition: FlowDefinition): string | null {
    const firstAgentNode = flowDefinition.nodes.find((node) => node.type === "agent");
    return firstAgentNode?.data.instructions ?? null;
  }

  private extractResponseTemplate(flowDefinition: FlowDefinition): string | null {
    const firstResponseNode = flowDefinition.nodes.find((node) => node.type === "response");
    return firstResponseNode?.data.messageTemplate ?? null;
  }

  private createTraceEvent(
    sessionId: string,
    type: TraceEvent["type"],
    timestamp: string,
    options?: {
      nodeId?: string;
      edgeId?: string;
      message?: string;
      payload?: Record<string, unknown>;
    }
  ): TraceEvent {
    const traceEvent: TraceEvent = {
      id: this.newId(),
      sessionId,
      type,
      timestamp
    };

    if (options?.nodeId) {
      traceEvent.nodeId = options.nodeId;
    }
    if (options?.edgeId) {
      traceEvent.edgeId = options.edgeId;
    }
    if (options?.message) {
      traceEvent.message = options.message;
    }
    if (options?.payload) {
      traceEvent.payload = options.payload;
    }

    return traceEvent;
  }

  private newId(): string {
    return randomUUID();
  }

  private nowIso(): string {
    return new Date().toISOString();
  }
}
