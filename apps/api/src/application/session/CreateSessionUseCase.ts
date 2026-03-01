import { randomUUID } from "node:crypto";

import type {
  CreateSessionRequest,
  CreateSessionResponse,
  ExecutionState,
  SessionState,
  TraceEvent
} from "@devday/shared";

import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";
import type { ICreateSessionUseCaseDependencies } from "./ICreateSessionUseCaseDependencies.js";

export class CreateSessionUseCase {
  constructor(private readonly dependencies: ICreateSessionUseCaseDependencies) {}

  async execute(input: CreateSessionRequest): Promise<CreateSessionResponse> {
    const flowDefinition = await this.dependencies.flowRepository.getById(input.flowId);
    if (!flowDefinition) {
      throw new FlowNotFoundError(input.flowId);
    }

    const nowIso = this.nowIso();
    const sessionId = this.newId();

    const executionState: ExecutionState = {
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

    await this.dependencies.sessionStateStore.create(sessionState);

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
