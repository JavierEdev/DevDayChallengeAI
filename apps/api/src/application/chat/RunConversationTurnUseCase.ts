import { randomUUID } from "node:crypto";

import type {
  SendMessageRequest,
  SendMessageResponse,
  SessionMessage,
  SessionState,
  ToolNodeData,
  TraceEvent
} from "@devday/shared";

import type {
  IAgentLlmInvocation,
  IAgentLlmResult,
  IAgentLlmPort
} from "../../domain/agent/IAgentLlmPort.js";
import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";
import type { ISessionStateStore } from "../../domain/session/ISessionStateStore.js";
import type { IToolDataset } from "../../domain/tool/IToolRepository.js";
import type { IToolRepository } from "../../domain/tool/IToolRepository.js";
import type { IToolSemanticMatch } from "../../domain/tool/IToolRepository.js";
import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";
import { SessionNotFoundError } from "../errors/SessionNotFoundError.js";
import { RunConversationTurnAgentComposer } from "./RunConversationTurnAgentComposer.js";
import { RunConversationTurnAgentResponseResolver } from "./RunConversationTurnAgentResponseResolver.js";
import { RunConversationTurnFlowNavigator } from "./RunConversationTurnFlowNavigator.js";
import { RunConversationTurnHelper } from "./RunConversationTurnHelper.js";
import { RunConversationTurnValidatorEngine } from "./RunConversationTurnValidatorEngine.js";

const MAX_TOOL_CONTEXT_RECORDS = 2;
const MAX_TOOL_OUTPUT_RECORDS = 12;
const MAX_TOOL_CONTEXT_CONTENT_CHARS = 160;
const MAX_MESSAGE_HISTORY = 6;
const MAX_TURN_NODE_STEPS = 24;
const DEFAULT_TOOL_SEMANTIC_TIMEOUT_MS = 1_200;
const DEFAULT_AGENT_TIMEOUT_MS = 20_000;
const DEFAULT_AGENT_MAX_TOKENS = 140;
const DIRECT_TOOL_RESULT_LIMIT = 3;
const LAST_AGENT_RESPONSE_VARIABLE = "lastAgentResponse";
const PREFERRED_AGENT_MODEL = "gemini-3-flash";
const RESILIENT_FALLBACK_AGENT_MODEL = "gemini-2.5-flash";
const SPECIALIST_CONTEXT_DATASETS = ["faqs", "catalogo", "agenda"] as const;
const LEGACY_AGENT_MODELS = new Set([
  "gemini-2.0-flash",
  "gemini-2.5-flash"
]);

export interface IRunConversationTurnUseCaseOptions {
  agentTimeoutMs?: number;
  useAgentLlm?: boolean;
  useValidatorLlm?: boolean;
}

export class RunConversationTurnUseCase {
  private readonly agentTimeoutMs: number;
  private readonly useAgentLlm: boolean;
  private readonly validatorEngine: RunConversationTurnValidatorEngine;
  private readonly agentComposer: RunConversationTurnAgentComposer;
  private readonly agentResponseResolver: RunConversationTurnAgentResponseResolver;

  constructor(
    private readonly sessionStateStore: ISessionStateStore,
    private readonly flowRepository: IFlowRepository,
    private readonly toolRepository: IToolRepository,
    private readonly agentLlmPort: IAgentLlmPort,
    options: IRunConversationTurnUseCaseOptions = {}
  ) {
    this.agentTimeoutMs = resolvePositiveTimeout(options.agentTimeoutMs, DEFAULT_AGENT_TIMEOUT_MS);
    this.useAgentLlm = options.useAgentLlm ?? true;
    this.validatorEngine = new RunConversationTurnValidatorEngine(
      this.agentLlmPort,
      this.withTimeout.bind(this),
      options.useValidatorLlm ?? true
    );
    this.agentComposer = new RunConversationTurnAgentComposer({
      maxToolContextRecords: MAX_TOOL_CONTEXT_RECORDS,
      maxToolContextContentChars: MAX_TOOL_CONTEXT_CONTENT_CHARS,
      maxMessageHistory: MAX_MESSAGE_HISTORY,
      directToolResultLimit: DIRECT_TOOL_RESULT_LIMIT,
      lastAgentResponseVariable: LAST_AGENT_RESPONSE_VARIABLE
    });
    this.agentResponseResolver = new RunConversationTurnAgentResponseResolver(
      this.useAgentLlm,
      this.agentComposer,
      this.invokeAgentNodeLlm.bind(this)
    );
  }

  async execute(input: SendMessageRequest): Promise<SendMessageResponse> {
    const sessionState = await this.sessionStateStore.getById(input.sessionId);
    if (!sessionState) {
      throw new SessionNotFoundError(input.sessionId);
    }
    const flowDefinition = await this.flowRepository.getById(sessionState.flowId);
    if (!flowDefinition) {
      throw new FlowNotFoundError(sessionState.flowId);
    }

    const nodeMap = RunConversationTurnFlowNavigator.buildNodeMap(flowDefinition);
    const runtimeToolDatasets: IToolDataset[] = [];

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
      sessionState.variables = {
        ...sessionState.variables,
        ...input.metadata
      };
    }

    sessionState.messages.push(userMessage);
    sessionState.status = "running";
    sessionState.updatedAt = userMessageTimestamp;
    sessionState.execution.updatedAt = userMessageTimestamp;

    traceEvents.push(this.createTraceEvent(sessionState.id, "message_received", userMessageTimestamp, {
      message: "Mensaje del usuario procesado"
    }));

    let currentNodeId = RunConversationTurnFlowNavigator.resolveStartingNodeId(
      sessionState,
      flowDefinition,
      nodeMap
    );
    let nodeSteps = 0;

    while (nodeSteps < MAX_TURN_NODE_STEPS) {
      const node = nodeMap.get(currentNodeId);
      if (!node) {
        return this.failTurn(sessionState, traceEvents, `Nodo no encontrado en runtime: ${currentNodeId}`);
      }
      nodeSteps += 1;

      const nodeTimestamp = this.nowIso();
      sessionState.execution.currentNodeId = node.id;
      sessionState.execution.updatedAt = nodeTimestamp;
      sessionState.execution.stepCount += 1;
      sessionState.execution.visitedNodeIds.push(node.id);

      traceEvents.push(
        this.createTraceEvent(sessionState.id, "node_entered", nodeTimestamp, {
          nodeId: node.id,
          message: `Ejecutando nodo ${node.type}`
        })
      );

      if (node.type === "start") {
        const next = RunConversationTurnFlowNavigator.selectNextNode(flowDefinition, node.id);
        if (!next.nextNodeId) {
          return this.failTurn(
            sessionState,
            traceEvents,
            `El nodo start "${node.id}" no tiene salida configurada.`
          );
        }

        sessionState.execution.nextNodeId = next.nextNodeId;
        traceEvents.push(
          this.createTraceEvent(sessionState.id, "node_completed", this.nowIso(), {
            nodeId: node.id,
            edgeId: next.edgeId,
            message: `Nodo start completado, avanzando a ${next.nextNodeId}`
          })
        );
        currentNodeId = next.nextNodeId;
        continue;
      }

      if (node.type === "memory") {
        const memoryTimestamp = this.nowIso();
        if (node.data.mode === "read") {
          traceEvents.push(
            this.createTraceEvent(sessionState.id, "node_completed", memoryTimestamp, {
              nodeId: node.id,
              message: "Nodo memory-read completado"
            })
          );
        } else {
          // En esta version la memoria vive en sessionState (variables + messages).
          sessionState.execution.updatedAt = memoryTimestamp;
          traceEvents.push(
            this.createTraceEvent(sessionState.id, "node_completed", memoryTimestamp, {
              nodeId: node.id,
              message: "Nodo memory-write completado"
            })
          );
        }

        const next = RunConversationTurnFlowNavigator.selectNextNode(flowDefinition, node.id);
        if (!next.nextNodeId) {
          return this.failTurn(
            sessionState,
            traceEvents,
            `El nodo memory "${node.id}" no tiene salida configurada.`
          );
        }

        sessionState.execution.nextNodeId = next.nextNodeId;
        currentNodeId = next.nextNodeId;
        continue;
      }

      if (node.type === "router") {
        const routeSelection = RunConversationTurnFlowNavigator.selectRouterTarget(
          flowDefinition,
          node,
          input.message
        );
        if (!routeSelection.nextNodeId) {
          return this.failTurn(
            sessionState,
            traceEvents,
            `El router "${node.id}" no pudo determinar nodo destino.`
          );
        }

        sessionState.execution.nextNodeId = routeSelection.nextNodeId;
        traceEvents.push(
          this.createTraceEvent(sessionState.id, "route_selected", this.nowIso(), {
            nodeId: node.id,
            edgeId: routeSelection.edgeId,
            message: routeSelection.reason ?? `Ruta seleccionada a ${routeSelection.nextNodeId}`,
            payload: {
              routeId: routeSelection.routeId,
              targetNodeId: routeSelection.nextNodeId
            }
          }),
          this.createTraceEvent(sessionState.id, "node_completed", this.nowIso(), {
            nodeId: node.id,
            edgeId: routeSelection.edgeId,
            message: `Nodo router completado, avanzando a ${routeSelection.nextNodeId}`
          })
        );

        currentNodeId = routeSelection.nextNodeId;
        continue;
      }

      if (node.type === "validator") {
        const runtimeRules = this.validatorEngine.resolveRules(node.data);
        const extractedFields = await this.validatorEngine.hydrateVariablesFromText(
          sessionState,
          input.message,
          runtimeRules
        );
        if (extractedFields.length > 0) {
          traceEvents.push(
            this.createTraceEvent(sessionState.id, "node_completed", this.nowIso(), {
              nodeId: node.id,
              message: "Se extrajeron variables desde texto libre",
              payload: { extractedFields }
            })
          );
        }

        const evaluation = this.validatorEngine.evaluate(node.data, sessionState.variables);
        if (evaluation.passed) {
          const preferredNextNodeId = node.data.onCompleteTargetNodeId;
          const next = preferredNextNodeId
            ? RunConversationTurnFlowNavigator.selectSpecificNextNode(
                flowDefinition,
                node.id,
                preferredNextNodeId
              )
            : RunConversationTurnFlowNavigator.selectNextNode(flowDefinition, node.id);
          if (!next.nextNodeId) {
            return this.failTurn(
              sessionState,
              traceEvents,
              `El nodo validator "${node.id}" no tiene salida configurada.`
            );
          }

          sessionState.execution.nextNodeId = next.nextNodeId;
          traceEvents.push(
            this.createTraceEvent(sessionState.id, "node_completed", this.nowIso(), {
              nodeId: node.id,
              edgeId: next.edgeId,
              message: `Validacion completada, avanzando a ${next.nextNodeId}`
            })
          );
          currentNodeId = next.nextNodeId;
          continue;
        }

        traceEvents.push(
          this.createTraceEvent(sessionState.id, "validation_failed", this.nowIso(), {
            nodeId: node.id,
            message: "Validacion fallida en nodo validator",
            payload: {
              failedFields: evaluation.failedRules.map((rule) => rule.field)
            }
          })
        );

        if (node.data.onFailNodeId) {
          sessionState.execution.nextNodeId = node.data.onFailNodeId;
          currentNodeId = node.data.onFailNodeId;
          continue;
        }

        const missingFieldsMessage = await this.validatorEngine.buildMissingFieldsMessage(
          evaluation.failedRules,
          input.message
        );
        const assistantMessage = this.createAssistantMessage(missingFieldsMessage);
        sessionState.messages.push(assistantMessage);
        sessionState.status = "waiting_input";
        sessionState.updatedAt = assistantMessage.createdAt;
        sessionState.execution.nextNodeId = node.id;
        sessionState.execution.updatedAt = assistantMessage.createdAt;

        traceEvents.push(
          this.createTraceEvent(sessionState.id, "response_generated", assistantMessage.createdAt, {
            nodeId: node.id,
            message: "Se solicito informacion faltante al usuario"
          }),
          this.createTraceEvent(sessionState.id, "node_completed", assistantMessage.createdAt, {
            nodeId: node.id,
            message: "Nodo validator completado en modo espera de datos"
          })
        );

        await this.sessionStateStore.update(sessionState);
        return {
          session: sessionState,
          status: sessionState.status,
          trace: traceEvents,
          assistantMessage
        };
      }

      if (node.type === "tool") {
        const toolDatasetNames = this.resolveToolDatasetNames(node.data);
        const semanticTimeoutMs = Math.max(
          250,
          node.data.timeoutMs ?? DEFAULT_TOOL_SEMANTIC_TIMEOUT_MS
        );
        const loadedDatasets: IToolDataset[] = [];
        for (const datasetName of toolDatasetNames) {
          let semanticMatches: IToolSemanticMatch[] = [];
          try {
            semanticMatches = await this.withTimeout(
              this.toolRepository.searchSimilarRecords({
                query: input.message,
                datasetName,
                limit: MAX_TOOL_CONTEXT_RECORDS
              }),
              semanticTimeoutMs,
              `La busqueda semantica excedio ${semanticTimeoutMs}ms`
            );
          } catch (error) {
            traceEvents.push(
              this.createTraceEvent(sessionState.id, "tool_called", this.nowIso(), {
                nodeId: node.id,
                message: `Busqueda semantica fallo para dataset "${datasetName}". Se usa fallback.`,
                payload: {
                  dataset: datasetName,
                  error: RunConversationTurnHelper.formatUnknownError(error)
                }
              })
            );
          }

          if (semanticMatches.length > 0) {
            const semanticDataset = this.buildSemanticDataset(
              datasetName,
              undefined,
              semanticMatches
            );
            loadedDatasets.push(semanticDataset);
            runtimeToolDatasets.push(semanticDataset);

            traceEvents.push(
              this.createTraceEvent(sessionState.id, "tool_called", this.nowIso(), {
                nodeId: node.id,
                message: `Tool dataset "${datasetName}" recuperado por similitud semantica`,
                payload: {
                  dataset: datasetName,
                  records: semanticDataset.records.length,
                  semantic: true,
                  topSimilarity: semanticMatches[0]?.similarity ?? 0
                }
              })
            );
            continue;
          }

          const dataset = await this.toolRepository.getDatasetByName(datasetName);
          if (!dataset) {
            traceEvents.push(
              this.createTraceEvent(sessionState.id, "tool_called", this.nowIso(), {
                nodeId: node.id,
                message: `Tool dataset "${datasetName}" no encontrado`,
                payload: { dataset: datasetName }
              })
            );
            continue;
          }

          const compactFallbackDataset: IToolDataset = {
            name: dataset.name,
            description: dataset.description,
            records: dataset.records.slice(0, MAX_TOOL_OUTPUT_RECORDS)
          };
          loadedDatasets.push(compactFallbackDataset);
          runtimeToolDatasets.push(compactFallbackDataset);

          traceEvents.push(
            this.createTraceEvent(sessionState.id, "tool_called", this.nowIso(), {
              nodeId: node.id,
              message: `Tool dataset "${dataset.name}" cargado`,
              payload: {
                dataset: dataset.name,
                records: compactFallbackDataset.records.length,
                totalRecords: dataset.records.length,
                semantic: false,
                reason: "fallback_no_semantic_matches_or_disabled"
              }
            })
          );
        }

        if (node.data.outputVariable) {
          const outputRecords = loadedDatasets
            .flatMap((dataset) => dataset.records)
            .slice(0, MAX_TOOL_OUTPUT_RECORDS);
          sessionState.variables[node.data.outputVariable] = outputRecords;
        }

        const next = RunConversationTurnFlowNavigator.selectNextNode(flowDefinition, node.id);
        if (!next.nextNodeId) {
          return this.failTurn(
            sessionState,
            traceEvents,
            `El nodo tool "${node.id}" no tiene salida configurada.`
          );
        }

        sessionState.execution.nextNodeId = next.nextNodeId;
        traceEvents.push(
          this.createTraceEvent(sessionState.id, "node_completed", this.nowIso(), {
            nodeId: node.id,
            edgeId: next.edgeId,
            message: `Nodo tool completado, avanzando a ${next.nextNodeId}`
          })
        );

        currentNodeId = next.nextNodeId;
        continue;
      }

      if (node.type === "agent") {
        const agentRole = this.resolveAgentRole(node.data.label);
        const agentRuntimeDatasets = await this.resolveAgentRuntimeDatasets(
          agentRole,
          input.message,
          runtimeToolDatasets
        );

        try {
          const llmResult = await this.agentResponseResolver.resolve({
            userMessage: input.message,
            flowDefinition,
            sessionState,
            agentNodeData: node.data,
            agentRole,
            agentRuntimeDatasets
          });

          sessionState.variables[LAST_AGENT_RESPONSE_VARIABLE] = llmResult.text;
          sessionState.variables[`agentResponse:${node.id}`] = llmResult.text;

          traceEvents.push(
            this.createTraceEvent(sessionState.id, "agent_responded", this.nowIso(), {
              nodeId: node.id,
              message: "Respuesta del agente generada",
              payload: {
                model: llmResult.model
              }
            })
          );

          const next = RunConversationTurnFlowNavigator.selectNextNode(flowDefinition, node.id);
          if (!next.nextNodeId) {
            const assistantMessage = this.createAssistantMessage(llmResult.text, {
              nodeId: node.id,
              model: llmResult.model
            });
            sessionState.messages.push(assistantMessage);
            sessionState.status = "waiting_input";
            sessionState.updatedAt = assistantMessage.createdAt;
            sessionState.execution.nextNodeId = flowDefinition.startNodeId;
            sessionState.execution.updatedAt = assistantMessage.createdAt;

            traceEvents.push(
              this.createTraceEvent(sessionState.id, "response_generated", assistantMessage.createdAt, {
                nodeId: node.id,
                message: "Se envio respuesta del agente al usuario"
              }),
              this.createTraceEvent(sessionState.id, "node_completed", assistantMessage.createdAt, {
                nodeId: node.id,
                message: "Nodo agent completado"
              })
            );

            await this.sessionStateStore.update(sessionState);
            return {
              session: sessionState,
              status: sessionState.status,
              trace: traceEvents,
              assistantMessage
            };
          }

          sessionState.execution.nextNodeId = next.nextNodeId;
          traceEvents.push(
            this.createTraceEvent(sessionState.id, "node_completed", this.nowIso(), {
              nodeId: node.id,
              edgeId: next.edgeId,
              message: `Nodo agent completado, avanzando a ${next.nextNodeId}`
            })
          );

          currentNodeId = next.nextNodeId;
          continue;
        } catch (error) {
          return this.failTurn(
            sessionState,
            traceEvents,
            `Error ejecutando agente "${node.id}": ${RunConversationTurnHelper.formatUnknownError(error)}`
          );
        }
      }

      if (node.type === "response") {
        const responseText = this.agentComposer.buildResponseText(
          node.data.messageTemplate,
          sessionState.variables
        );
        const assistantMessage = this.createAssistantMessage(responseText, {
          nodeId: node.id
        });
        sessionState.messages.push(assistantMessage);

        const responseTimestamp = assistantMessage.createdAt;
        sessionState.status = node.data.endSession ? "completed" : "waiting_input";
        sessionState.updatedAt = responseTimestamp;
        sessionState.execution.updatedAt = responseTimestamp;

        if (node.data.endSession) {
          delete sessionState.execution.nextNodeId;
        } else {
          const nextAfterResponse = RunConversationTurnFlowNavigator.selectNextNode(flowDefinition, node.id);
          sessionState.execution.nextNodeId = nextAfterResponse.nextNodeId ?? flowDefinition.startNodeId;
        }

        traceEvents.push(
          this.createTraceEvent(sessionState.id, "response_generated", responseTimestamp, {
            nodeId: node.id,
            message: "Mensaje final del flujo generado"
          }),
          this.createTraceEvent(sessionState.id, "node_completed", responseTimestamp, {
            nodeId: node.id,
            message: "Nodo response completado"
          })
        );

        if (node.data.endSession) {
          traceEvents.push(
            this.createTraceEvent(sessionState.id, "session_completed", responseTimestamp, {
              nodeId: node.id,
              message: "Sesion completada por nodo response"
            })
          );
        }

        await this.sessionStateStore.update(sessionState);
        return {
          session: sessionState,
          status: sessionState.status,
          trace: traceEvents,
          assistantMessage
        };
      }
    }

    return this.failTurn(
      sessionState,
      traceEvents,
      `Se alcanzo el maximo de ${MAX_TURN_NODE_STEPS} pasos en un turno.`
    );
  }

  private resolveToolDatasetNames(toolNodeData: ToolNodeData): string[] {
    const names = new Set<string>();
    if (toolNodeData.toolName) {
      names.add(toolNodeData.toolName);
    }

    for (const collectionName of toolNodeData.availableCollections ?? []) {
      names.add(collectionName);
    }

    return Array.from(names);
  }

  private async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    timeoutMessage: string
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(timeoutMessage));
      }, timeoutMs);

      promise
        .then((value) => {
          clearTimeout(timeoutId);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private buildSemanticDataset(
    datasetName: string,
    datasetDescription: string | undefined,
    semanticMatches: IToolSemanticMatch[]
  ): IToolDataset {
    return {
      name: datasetName,
      description: datasetDescription ?? `Resultados semanticos para ${datasetName}`,
      records: semanticMatches.map((match) => {
        const record = {
          id: match.id,
          title: match.title,
          content: match.content
        };
        if (Array.isArray(match.tags) && match.tags.length > 0) {
          return {
            ...record,
            tags: match.tags
          };
        }

        return record;
      })
    };
  }

  private createAssistantMessage(
    content: string,
    metadata?: Record<string, unknown>
  ): SessionMessage {
    const message: SessionMessage = {
      id: this.newId(),
      role: "assistant",
      content,
      createdAt: this.nowIso()
    };

    if (metadata) {
      message.metadata = metadata;
    }

    return message;
  }

  private async failTurn(
    sessionState: SessionState,
    traceEvents: TraceEvent[],
    reason: string
  ): Promise<SendMessageResponse> {
    const failedTimestamp = this.nowIso();
    sessionState.status = "failed";
    sessionState.updatedAt = failedTimestamp;
    sessionState.execution.updatedAt = failedTimestamp;
    sessionState.execution.lastError = reason;
    delete sessionState.execution.nextNodeId;

    traceEvents.push(
      this.createTraceEvent(sessionState.id, "runtime_error", failedTimestamp, {
        nodeId: sessionState.execution.currentNodeId,
        message: reason
      })
    );

    const assistantMessage = this.createAssistantMessage(
      this.buildUserFacingRuntimeErrorMessage(reason)
    );
    sessionState.messages.push(assistantMessage);
    traceEvents.push(
      this.createTraceEvent(sessionState.id, "response_generated", assistantMessage.createdAt, {
        nodeId: sessionState.execution.currentNodeId,
        message: "Se devolvio mensaje de error al usuario"
      })
    );

    await this.sessionStateStore.update(sessionState);

    return {
      session: sessionState,
      status: sessionState.status,
      trace: traceEvents,
      assistantMessage
    };
  }

  private createTraceEvent(
    sessionId: string,
    type: TraceEvent["type"],
    timestamp: string,
    options?: {
      nodeId?: string | undefined;
      edgeId?: string | undefined;
      message?: string | undefined;
      payload?: Record<string, unknown> | undefined;
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

  private buildUserFacingRuntimeErrorMessage(reason: string): string {
    const normalizedReason = reason.toLowerCase();
    if (normalizedReason.includes("la respuesta del agente excedio")) {
      return "El agente tardo demasiado en responder. Intenta nuevamente en unos segundos.";
    }

    if (
      normalizedReason.includes("model") ||
      normalizedReason.includes("modelo") ||
      normalizedReason.includes("not found") ||
      normalizedReason.includes("unsupported")
    ) {
      return "El modelo configurado no esta disponible en este momento. Intenta nuevamente en unos segundos.";
    }

    if (normalizedReason.includes("api key")) {
      return "El servicio del modelo no esta configurado correctamente. Intenta nuevamente mas tarde.";
    }

    return "Ocurrio un error al ejecutar el flujo. Intenta nuevamente.";
  }

  private resolveAgentModel(configuredModel: string | undefined): string {
    if (!configuredModel) {
      return PREFERRED_AGENT_MODEL;
    }

    const normalized = configuredModel.trim().toLowerCase();
    if (LEGACY_AGENT_MODELS.has(normalized)) {
      return PREFERRED_AGENT_MODEL;
    }

    return configuredModel;
  }

  private resolveAgentRole(agentLabel: string | undefined): "specialist" | "generic" {
    const normalized = agentLabel?.trim().toLowerCase();
    return normalized === "generic" ? "generic" : "specialist";
  }

  private async resolveAgentRuntimeDatasets(
    agentRole: "specialist" | "generic",
    userMessage: string,
    baseDatasets: IToolDataset[]
  ): Promise<IToolDataset[]> {
    if (agentRole === "generic") {
      return [];
    }

    const merged = new Map<string, IToolDataset>();
    for (const dataset of baseDatasets) {
      merged.set(dataset.name, dataset);
    }

    for (const datasetName of SPECIALIST_CONTEXT_DATASETS) {
      if (merged.has(datasetName)) {
        continue;
      }

      try {
        const semanticMatches = await this.withTimeout(
          this.toolRepository.searchSimilarRecords({
            query: userMessage,
            datasetName,
            limit: MAX_TOOL_CONTEXT_RECORDS
          }),
          DEFAULT_TOOL_SEMANTIC_TIMEOUT_MS,
          `La busqueda semantica excedio ${DEFAULT_TOOL_SEMANTIC_TIMEOUT_MS}ms`
        );

        if (semanticMatches.length > 0) {
          merged.set(
            datasetName,
            this.buildSemanticDataset(datasetName, undefined, semanticMatches)
          );
          continue;
        }
      } catch {
        // Si falla la similitud semantica, se intenta fallback directo al dataset local.
      }

      const dataset = await this.toolRepository.getDatasetByName(datasetName);
      if (!dataset) {
        continue;
      }

      merged.set(datasetName, {
        name: dataset.name,
        description: dataset.description,
        records: dataset.records.slice(0, MAX_TOOL_OUTPUT_RECORDS)
      });
    }

    return Array.from(merged.values());
  }

  private async invokeAgentNodeLlm(
    agentNodeData: { model?: string; temperature?: number },
    messages: IAgentLlmInvocation["messages"],
    maxTokens: number = DEFAULT_AGENT_MAX_TOKENS
  ): Promise<IAgentLlmResult | null> {
    const llmInvocation: IAgentLlmInvocation = {
      messages,
      model: this.resolveAgentModel(agentNodeData.model),
      maxTokens
    };
    if (agentNodeData.temperature !== undefined) {
      llmInvocation.temperature = agentNodeData.temperature;
    }

    try {
      return await this.withTimeout(
        this.agentLlmPort.invoke(llmInvocation),
        this.agentTimeoutMs,
        `La respuesta del agente excedio ${this.agentTimeoutMs}ms`
      );
    } catch (llmError) {
      const modelFallbackResult = await this.tryInvokeWithFallbackModel(
        llmInvocation,
        llmError
      );
      return modelFallbackResult ?? null;
    }
  }

  private async tryInvokeWithFallbackModel(
    invocation: IAgentLlmInvocation,
    rootError: unknown
  ): Promise<IAgentLlmResult | null> {
    if (!this.isModelAvailabilityError(rootError)) {
      return null;
    }

    const currentModel = invocation.model?.trim().toLowerCase();
    if (currentModel === RESILIENT_FALLBACK_AGENT_MODEL) {
      return null;
    }

    const fallbackInvocation: IAgentLlmInvocation = {
      ...invocation,
      model: RESILIENT_FALLBACK_AGENT_MODEL
    };

    try {
      const result = await this.withTimeout(
        this.agentLlmPort.invoke(fallbackInvocation),
        this.agentTimeoutMs,
        `La respuesta del agente excedio ${this.agentTimeoutMs}ms`
      );

      return {
        ...result,
        model: RESILIENT_FALLBACK_AGENT_MODEL
      };
    } catch {
      return null;
    }
  }

  private isModelAvailabilityError(error: unknown): boolean {
    const message = RunConversationTurnHelper.formatUnknownError(error).toLowerCase();
    return (
      message.includes("model") ||
      message.includes("modelo") ||
      message.includes("not found") ||
      message.includes("unsupported") ||
      message.includes("permission denied")
    );
  }
}

function resolvePositiveTimeout(
  value: number | undefined,
  fallback: number
): number {
  if (value === undefined) {
    return fallback;
  }

  if (!Number.isFinite(value)) {
    return fallback;
  }

  const normalized = Math.trunc(value);
  return normalized > 0 ? normalized : fallback;
}
