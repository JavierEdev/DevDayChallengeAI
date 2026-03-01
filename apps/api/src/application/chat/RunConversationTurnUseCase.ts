import { randomUUID } from "node:crypto";

import type {
  AgentNodeData,
  FlowDefinition,
  FlowNode,
  SendMessageRequest,
  SendMessageResponse,
  SessionMessage,
  SessionState,
  ToolNodeData,
  TraceEvent,
  ValidationOperator,
  ValidationRule,
  ValidatorNodeData
} from "@devday/shared";

import type {
  IAgentLlmInvocation,
  IAgentLlmMessage,
  IAgentLlmPort
} from "../../domain/agent/IAgentLlmPort.js";
import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";
import type { ISessionStateStore } from "../../domain/session/ISessionStateStore.js";
import type { IToolDataset } from "../../domain/tool/IToolRepository.js";
import type { IToolRepository } from "../../domain/tool/IToolRepository.js";
import type { IToolSemanticMatch } from "../../domain/tool/IToolRepository.js";
import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";
import { SessionNotFoundError } from "../errors/SessionNotFoundError.js";
import { RunConversationTurnHelper } from "./RunConversationTurnHelper.js";

const MAX_TOOL_CONTEXT_RECORDS = 5;
const MAX_TOOL_OUTPUT_RECORDS = 20;
const MAX_TOOL_CONTEXT_CONTENT_CHARS = 360;
const MAX_MESSAGE_HISTORY = 12;
const MAX_TURN_NODE_STEPS = 24;
const MAX_VALIDATOR_EXTRACTION_FIELDS = 12;
const DEFAULT_TOOL_SEMANTIC_TIMEOUT_MS = 3_000;
const DEFAULT_VALIDATOR_LLM_EXTRACTION_TIMEOUT_MS = 4_000;
const DEFAULT_AGENT_TIMEOUT_MS = 60_000;
const DEFAULT_AGENT_MAX_TOKENS = 320;
const LAST_AGENT_RESPONSE_VARIABLE = "lastAgentResponse";
const LEGACY_AGENT_MODEL = "gemini-2.0-flash";
const FALLBACK_AGENT_MODEL = "gemini-2.5-flash";

interface INextNodeSelection {
  nextNodeId: string | null;
  edgeId?: string | undefined;
}

interface IRouterSelection extends INextNodeSelection {
  routeId?: string | undefined;
  reason?: string | undefined;
}

interface IValidatorEvaluation {
  passed: boolean;
  failedRules: ValidationRule[];
}

export interface IRunConversationTurnUseCaseOptions {
  agentTimeoutMs?: number;
}

export class RunConversationTurnUseCase {
  private readonly agentTimeoutMs: number;

  constructor(
    private readonly sessionStateStore: ISessionStateStore,
    private readonly flowRepository: IFlowRepository,
    private readonly toolRepository: IToolRepository,
    private readonly agentLlmPort: IAgentLlmPort,
    options: IRunConversationTurnUseCaseOptions = {}
  ) {
    this.agentTimeoutMs = resolvePositiveTimeout(options.agentTimeoutMs, DEFAULT_AGENT_TIMEOUT_MS);
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

    const nodeMap = this.buildNodeMap(flowDefinition);
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

    let currentNodeId = this.resolveStartingNodeId(sessionState, flowDefinition, nodeMap);
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
        const next = this.selectNextNode(flowDefinition, node.id);
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

        const next = this.selectNextNode(flowDefinition, node.id);
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
        const routeSelection = this.selectRouterTarget(flowDefinition, node, input.message);
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
        const runtimeRules = this.resolveValidatorRules(node.data);
        const extractedFields = await this.hydrateValidatorVariablesFromText(
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

        const evaluation = this.evaluateValidatorNode(node.data, sessionState.variables);
        if (evaluation.passed) {
          const preferredNextNodeId = node.data.onCompleteTargetNodeId;
          const next = preferredNextNodeId
            ? this.selectSpecificNextNode(flowDefinition, node.id, preferredNextNodeId)
            : this.selectNextNode(flowDefinition, node.id);
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

        const assistantMessage = this.createAssistantMessage(
          this.buildValidatorFailMessage(evaluation.failedRules)
        );
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

          loadedDatasets.push(dataset);
          runtimeToolDatasets.push(dataset);

          traceEvents.push(
            this.createTraceEvent(sessionState.id, "tool_called", this.nowIso(), {
              nodeId: node.id,
              message: `Tool dataset "${dataset.name}" cargado`,
              payload: {
                dataset: dataset.name,
                records: dataset.records.length,
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

        const next = this.selectNextNode(flowDefinition, node.id);
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
        const llmMessages = this.buildLlmMessages(sessionState, flowDefinition, node.data, runtimeToolDatasets);

        try {
          const llmInvocation: IAgentLlmInvocation = {
            messages: llmMessages
          };
          if (node.data.model) {
            llmInvocation.model =
              node.data.model.trim().toLowerCase() === LEGACY_AGENT_MODEL
                ? FALLBACK_AGENT_MODEL
                : node.data.model;
          }
          if (node.data.temperature !== undefined) {
            llmInvocation.temperature = node.data.temperature;
          }
          llmInvocation.maxTokens = DEFAULT_AGENT_MAX_TOKENS;

          const llmResult = await this.withTimeout(
            this.agentLlmPort.invoke(llmInvocation),
            this.agentTimeoutMs,
            `La respuesta del agente excedio ${this.agentTimeoutMs}ms`
          );

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

          const next = this.selectNextNode(flowDefinition, node.id);
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
        const responseText = this.buildResponseText(node.data.messageTemplate, sessionState.variables);
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
          const nextAfterResponse = this.selectNextNode(flowDefinition, node.id);
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

  private buildLlmMessages(
    sessionState: SessionState,
    flowDefinition: FlowDefinition,
    agentNodeData: AgentNodeData,
    runtimeToolDatasets: IToolDataset[]
  ): IAgentLlmMessage[] {
    const messages: IAgentLlmMessage[] = [];
    const toolContext = this.buildToolContext(runtimeToolDatasets);

    messages.push({
      role: "system",
      content: this.buildSystemPrompt(flowDefinition, agentNodeData, toolContext)
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

  private buildSystemPrompt(
    flowDefinition: FlowDefinition,
    agentNodeData: AgentNodeData,
    toolContext: string
  ): string {
    const basePrompt = [
      "Eres un asistente de una concesionaria de autos.",
      "Responde siempre en espanol neutro, de forma clara y breve.",
      "Usa solo la informacion disponible en el contexto y en el historial de mensajes.",
      "Si falta informacion, haz una pregunta de seguimiento concreta.",
      `Flujo actual: ${flowDefinition.name}.`
    ].join(" ");

    const promptSections: string[] = [basePrompt];
    promptSections.push(`Instrucciones del agente: ${agentNodeData.instructions}`);
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
        lines.push(`- ${record.title}: ${this.clampText(record.content, MAX_TOOL_CONTEXT_CONTENT_CHARS)}`);
      }
    }

    return lines.join("\n");
  }

  private resolveStartingNodeId(
    sessionState: SessionState,
    flowDefinition: FlowDefinition,
    nodeMap: Map<string, FlowNode>
  ): string {
    if (sessionState.execution.nextNodeId && nodeMap.has(sessionState.execution.nextNodeId)) {
      return sessionState.execution.nextNodeId;
    }
    return flowDefinition.startNodeId;
  }

  private buildNodeMap(flowDefinition: FlowDefinition): Map<string, FlowNode> {
    return new Map(flowDefinition.nodes.map((node) => [node.id, node]));
  }

  private selectNextNode(flowDefinition: FlowDefinition, sourceNodeId: string): INextNodeSelection {
    const outgoingEdges = flowDefinition.edges.filter((edge) => edge.source === sourceNodeId);
    const preferredEdge =
      outgoingEdges.find((edge) => edge.kind === "default") ?? outgoingEdges[0];
    if (!preferredEdge) {
      return { nextNodeId: null };
    }

    return {
      nextNodeId: preferredEdge.target,
      edgeId: preferredEdge.id
    };
  }

  private selectSpecificNextNode(
    flowDefinition: FlowDefinition,
    sourceNodeId: string,
    targetNodeId: string
  ): INextNodeSelection {
    const selectedEdge = flowDefinition.edges.find(
      (edge) => edge.source === sourceNodeId && edge.target === targetNodeId
    );
    if (!selectedEdge) {
      return { nextNodeId: null };
    }

    return {
      nextNodeId: selectedEdge.target,
      edgeId: selectedEdge.id
    };
  }

  private selectRouterTarget(
    flowDefinition: FlowDefinition,
    node: Extract<FlowNode, { type: "router" }>,
    userMessage: string
  ): IRouterSelection {
    const outgoingEdges = flowDefinition.edges.filter((edge) => edge.source === node.id);
    const normalizedMessage = userMessage.toLowerCase();

    for (const route of node.data.routes) {
      if (!this.matchesRoute(route.matchValue ?? route.key, normalizedMessage)) {
        continue;
      }

      const linkedEdge = outgoingEdges.find((edge) => edge.target === route.targetNodeId);
      return {
        nextNodeId: route.targetNodeId,
        edgeId: linkedEdge?.id,
        routeId: route.id ?? route.key,
        reason: `Router selecciono la ruta "${route.label}"`
      };
    }

    if (node.data.fallbackNodeId) {
      const fallbackEdge = outgoingEdges.find((edge) => edge.target === node.data.fallbackNodeId);
      return {
        nextNodeId: node.data.fallbackNodeId,
        edgeId: fallbackEdge?.id,
        reason: "Router uso fallbackNodeId"
      };
    }

    const fallbackEdge = outgoingEdges.find((edge) => edge.kind === "fallback");
    if (fallbackEdge) {
      return {
        nextNodeId: fallbackEdge.target,
        edgeId: fallbackEdge.id,
        reason: "Router uso edge fallback"
      };
    }

    const defaultEdge = outgoingEdges[0];
    if (defaultEdge) {
      return {
        nextNodeId: defaultEdge.target,
        edgeId: defaultEdge.id,
        reason: "Router uso la primera salida disponible"
      };
    }

    return { nextNodeId: null };
  }

  private matchesRoute(matchValue: string | undefined, normalizedMessage: string): boolean {
    if (!matchValue) {
      return false;
    }

    const isRegexPattern = matchValue.startsWith("/") && matchValue.endsWith("/") && matchValue.length > 2;
    if (isRegexPattern) {
      try {
        const expression = new RegExp(matchValue.slice(1, -1), "i");
        return expression.test(normalizedMessage);
      } catch {
        return false;
      }
    }

    const tokens = matchValue
      .toLowerCase()
      .split(/[|,]/)
      .map((token) => token.trim())
      .filter(Boolean);

    return tokens.some((token) => normalizedMessage.includes(token));
  }

  private evaluateValidatorNode(
    validatorNodeData: ValidatorNodeData,
    variables: Record<string, unknown>
  ): IValidatorEvaluation {
    const runtimeRules = this.resolveValidatorRules(validatorNodeData);
    const failedRules = runtimeRules.filter((rule) => !this.passesRule(rule, variables));
    const mode = validatorNodeData.mode ?? "all";

    if (mode === "any") {
      return {
        passed: failedRules.length < runtimeRules.length,
        failedRules
      };
    }

    return {
      passed: failedRules.length === 0,
      failedRules
    };
  }

  private resolveValidatorRules(validatorNodeData: ValidatorNodeData): ValidationRule[] {
    if (validatorNodeData.rules && validatorNodeData.rules.length > 0) {
      return validatorNodeData.rules;
    }

    const requiredFields = validatorNodeData.requiredFields ?? [];
    return requiredFields.map((field) => ({
      id: `required-${field}`,
      field,
      operator: "exists" as ValidationOperator,
      errorMessage: `Falta el campo requerido: ${field}`
    }));
  }

  private async hydrateValidatorVariablesFromText(
    sessionState: SessionState,
    userMessage: string,
    runtimeRules: ValidationRule[]
  ): Promise<string[]> {
    const candidateFields = Array.from(
      new Set(
        runtimeRules
          .filter((rule) => !this.passesRule(rule, sessionState.variables))
          .map((rule) => rule.field)
      )
    ).slice(0, MAX_VALIDATOR_EXTRACTION_FIELDS);

    if (candidateFields.length === 0) {
      return [];
    }

    const extractedFields = new Set<string>();
    for (const field of candidateFields) {
      const extractedValue = this.extractFieldValueByHeuristics(field, userMessage);
      if (extractedValue === undefined || extractedValue === null) {
        continue;
      }

      RunConversationTurnHelper.writeVariable(sessionState.variables, field, extractedValue);
      extractedFields.add(field);
    }

    const remainingFields = candidateFields.filter((field) => !extractedFields.has(field));
    if (remainingFields.length === 0) {
      return Array.from(extractedFields);
    }

    try {
      const llmExtractedValues = await this.withTimeout(
        this.extractFieldsWithLlm(userMessage, remainingFields),
        DEFAULT_VALIDATOR_LLM_EXTRACTION_TIMEOUT_MS,
        `La extraccion del validator excedio ${DEFAULT_VALIDATOR_LLM_EXTRACTION_TIMEOUT_MS}ms`
      );
      for (const [field, value] of Object.entries(llmExtractedValues)) {
        if (value === undefined || value === null) {
          continue;
        }

        const normalizedValue = typeof value === "string" ? value.trim() : String(value);
        if (!normalizedValue) {
          continue;
        }

        RunConversationTurnHelper.writeVariable(sessionState.variables, field, normalizedValue);
        extractedFields.add(field);
      }
    } catch {
      // Si el extractor por LLM falla, se mantiene la validacion normal sin romper el flujo.
    }

    return Array.from(extractedFields);
  }

  private extractFieldValueByHeuristics(fieldPath: string, userMessage: string): string | undefined {
    const normalizedFieldName = RunConversationTurnHelper.normalizeFieldName(fieldPath);

    if (normalizedFieldName.includes("nombre")) {
      const match = userMessage.match(/(?:mi nombre es|soy)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]+){0,4})/i);
      return match?.[1]?.trim();
    }

    if (normalizedFieldName.includes("presupuesto")) {
      const explicitBudgetMatch = userMessage.match(
        /(?:presupuesto(?:\s+de|\s+es)?|tengo(?:\s+un)?\s+presupuesto(?:\s+de)?)[^\d$QqGgTtUuSsDd]*((?:GTQ|GT|Q|USD|\$)?\s*\d[\d.,]*)/i
      );
      if (explicitBudgetMatch?.[1]) {
        return explicitBudgetMatch[1].trim();
      }

      const conversationalBudgetMatch = userMessage.match(
        /\b(?:tengo|cuento\s+con|manejo|dispongo\s+de)\s+((?:GTQ|GT|Q|USD|\$)\s*\d[\d.,]*)\b/i
      );
      if (conversationalBudgetMatch?.[1]) {
        return conversationalBudgetMatch[1].trim();
      }

      const currencyAmountMatch = userMessage.match(/\b((?:GTQ|GT|Q|USD|\$)\s*\d[\d.,]*)\b/i);
      return currencyAmountMatch?.[1]?.trim();
    }

    if (
      normalizedFieldName.includes("descuentoempleado") ||
      (normalizedFieldName.includes("descuento") && normalizedFieldName.includes("empleado"))
    ) {
      if (
        /\b(?:no\s+tengo|sin|ningun|ningún|no\s+cuento\s+con)\s+(?:descuento(?:\s+de)?\s+empleado|descuentoempleado)\b/i.test(
          userMessage
        ) ||
        /\bno\s+soy\s+empleado\b/i.test(userMessage)
      ) {
        return "no";
      }

      if (
        /\b(?:si|sí)\s+(?:tengo|cuento\s+con)\s+(?:descuento(?:\s+de)?\s+empleado|descuentoempleado)\b/i.test(
          userMessage
        ) ||
        /\btengo\s+descuento(?:\s+de)?\s+empleado\b/i.test(userMessage)
      ) {
        return "si";
      }
    }

    if (normalizedFieldName.includes("condicionvehiculo")) {
      const match = userMessage.match(
        /\b(nuevo|nueva|usado|usada|seminuevo|semi[-\s]?nuevo)\b/i
      );
      return match?.[1]?.trim();
    }

    if (
      normalizedFieldName.includes("tipovehiculo") ||
      normalizedFieldName.includes("vehiculo")
    ) {
      const match = userMessage.match(/\b(sedan|sedán|suv|pickup|pick-up|camioneta|hatchback|coupe|coupé)\b/i);
      return match?.[1]?.trim();
    }

    if (normalizedFieldName.includes("edad")) {
      const match = userMessage.match(/(\d{1,3})\s*(?:anos|años)?/i);
      return match?.[1]?.trim();
    }

    const lastSegment = fieldPath.split(".").pop()?.trim();
    if (!lastSegment) {
      return undefined;
    }

    const escapedField = RunConversationTurnHelper.escapeRegExp(lastSegment);
    const directPattern = new RegExp(`${escapedField}\\s*(?:es|:)\\s*([^,.\\n]+)`, "i");
    const directMatch = userMessage.match(directPattern);
    return directMatch?.[1]?.trim();
  }

  private async extractFieldsWithLlm(
    userMessage: string,
    fields: string[]
  ): Promise<Record<string, string | number | boolean | null>> {
    if (fields.length === 0) {
      return {};
    }

    const llmInvocation: IAgentLlmInvocation = {
      temperature: 0,
      messages: [
        {
          role: "system",
          content: [
            "Extrae datos estructurados de un mensaje de usuario.",
            "Responde unicamente con JSON valido.",
            "Usa exactamente las llaves solicitadas.",
            "Si no encuentras un valor, usa null.",
            "No incluyas markdown ni texto adicional."
          ].join(" ")
        },
        {
          role: "user",
          content: [
            `Llaves a extraer: ${fields.join(", ")}`,
            `Mensaje: ${userMessage}`
          ].join("\n")
        }
      ]
    };

    const llmResult = await this.agentLlmPort.invoke(llmInvocation);
    const parsedObject = RunConversationTurnHelper.parseFirstJsonObject(llmResult.text);
    if (!parsedObject) {
      return {};
    }

    const normalizedEntryMap = new Map<string, unknown>();
    for (const [key, value] of Object.entries(parsedObject)) {
      normalizedEntryMap.set(RunConversationTurnHelper.normalizeFieldName(key), value);
    }

    const output: Record<string, string | number | boolean | null> = {};
    for (const field of fields) {
      const value =
        parsedObject[field] ??
        normalizedEntryMap.get(RunConversationTurnHelper.normalizeFieldName(field));
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        output[field] = value;
      }
    }

    return output;
  }

  private passesRule(rule: ValidationRule, variables: Record<string, unknown>): boolean {
    const fieldValue = RunConversationTurnHelper.readVariable(variables, rule.field);
    if (rule.operator === "exists") {
      if (fieldValue === null || fieldValue === undefined) {
        return false;
      }
      if (typeof fieldValue === "string") {
        return fieldValue.trim().length > 0;
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.length > 0;
      }
      return true;
    }

    if (rule.operator === "equals") {
      if (rule.value === undefined || fieldValue === undefined || fieldValue === null) {
        return false;
      }

      if (typeof fieldValue === "string") {
        return fieldValue.toLowerCase() === rule.value.toLowerCase();
      }
      return String(fieldValue) === rule.value;
    }

    if (rule.operator === "contains") {
      if (rule.value === undefined || fieldValue === undefined || fieldValue === null) {
        return false;
      }

      if (typeof fieldValue === "string") {
        return fieldValue.toLowerCase().includes(rule.value.toLowerCase());
      }

      if (Array.isArray(fieldValue)) {
        const normalizedValues = fieldValue.map((item) => String(item).toLowerCase());
        return normalizedValues.includes(rule.value.toLowerCase());
      }

      return false;
    }

    if (rule.operator === "regex") {
      if (rule.value === undefined || typeof fieldValue !== "string") {
        return false;
      }

      try {
        return new RegExp(rule.value).test(fieldValue);
      } catch {
        return false;
      }
    }

    return false;
  }

  private buildValidatorFailMessage(failedRules: ValidationRule[]): string {
    if (failedRules.length === 0) {
      return "Necesito informacion adicional para continuar.";
    }

    const fields = failedRules.map((rule) => rule.errorMessage ?? `- ${rule.field}`);
    return `Antes de continuar necesito estos datos:\n${fields.join("\n")}`;
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

  private buildResponseText(
    messageTemplate: string,
    variables: Record<string, unknown>
  ): string {
    const renderedTemplate = messageTemplate.replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, fieldPath) => {
      const value = RunConversationTurnHelper.readVariable(variables, String(fieldPath));
      if (value === undefined || value === null) {
        return "";
      }
      if (typeof value === "string") {
        return value;
      }
      return JSON.stringify(value);
    }).trim();

    const lastAgentResponse = RunConversationTurnHelper.readVariable(variables, LAST_AGENT_RESPONSE_VARIABLE);
    if (!messageTemplate.includes("{{") && typeof lastAgentResponse === "string") {
      return `${renderedTemplate}\n\n${lastAgentResponse}`.trim();
    }

    if (renderedTemplate.length > 0) {
      return renderedTemplate;
    }

    if (typeof lastAgentResponse === "string" && lastAgentResponse.length > 0) {
      return lastAgentResponse;
    }

    return "No se pudo generar una respuesta.";
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

  private clampText(value: string, maxChars: number): string {
    const normalized = value.trim();
    if (normalized.length <= maxChars) {
      return normalized;
    }

    return `${normalized.slice(0, maxChars - 3)}...`;
  }

  private buildUserFacingRuntimeErrorMessage(reason: string): string {
    const normalizedReason = reason.toLowerCase();
    if (normalizedReason.includes("la respuesta del agente excedio")) {
      return "El agente tardo demasiado en responder. Intenta nuevamente en unos segundos.";
    }

    if (normalizedReason.includes("api key")) {
      return "El servicio del modelo no esta configurado correctamente. Intenta nuevamente mas tarde.";
    }

    return "Ocurrio un error al ejecutar el flujo. Intenta nuevamente.";
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
