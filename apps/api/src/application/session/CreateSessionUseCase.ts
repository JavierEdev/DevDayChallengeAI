import { randomUUID } from "node:crypto";

import type {
  CreateSessionRequest,
  CreateSessionResponse,
  ExecutionState,
  SessionState,
  TraceEvent
} from "@devday/shared";

import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";
import type { ISessionStateStore } from "../../domain/session/ISessionStateStore.js";
import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";

export class CreateSessionUseCase {
  constructor(
    private readonly sessionStateStore: ISessionStateStore,
    private readonly flowRepository: IFlowRepository
  ) {}

  async execute(input: CreateSessionRequest): Promise<CreateSessionResponse> {
    const flowDefinition = await this.flowRepository.getById(input.flowId);
    if (!flowDefinition) {
      throw new FlowNotFoundError(input.flowId);
    }

    const nowIso = this.nowIso();
    const sessionId = this.newId();

    const executionState: ExecutionState = {
      nextNodeId: flowDefinition.startNodeId,
      visitedNodeIds: [],
      stepCount: 0,
      startedAt: nowIso,
      updatedAt: nowIso
    };

    const sessionState: SessionState = {
      id: sessionId,
      flowId: input.flowId,
      status: "idle",
      variables: { ...(input.initialVariables ?? {}) },
      messages: [],
      execution: executionState,
      createdAt: nowIso,
      updatedAt: nowIso
    };

    await this.sessionStateStore.create(sessionState);

    const traceEvent: TraceEvent = {
      id: this.newId(),
      sessionId,
      type: "session_started",
      timestamp: nowIso,
      message: `Sesion creada para el flujo "${flowDefinition.name}"`
    };

    return {
      session: sessionState,
      status: sessionState.status,
      trace: [traceEvent]
    };
  }

  private newId(): string {
    return randomUUID();
  }

  private nowIso(): string {
    return new Date().toISOString();
  }
}
