import type { RuntimeStatus } from "../runtime/enums.js";
import type { SessionMessage, SessionState, TraceEvent } from "../runtime/types.js";
import type { FlowDefinition } from "../flow/types.js";

export interface CreateSessionRequest {
  flowId: string;
  initialVariables?: Record<string, unknown>;
  externalUserId?: string;
}

export interface CreateSessionResponse {
  session: SessionState;
  status: RuntimeStatus;
  trace: TraceEvent[];
  assistantMessage?: SessionMessage;
}

export interface SendMessageRequest {
  sessionId: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SendMessageResponse {
  session: SessionState;
  status: RuntimeStatus;
  trace: TraceEvent[];
  assistantMessage?: SessionMessage;
}

export type CreateFlowRequest = Omit<FlowDefinition, "id" | "createdAt" | "updatedAt">;

export interface CreateFlowResponse {
  flow: FlowDefinition;
}

export interface GetFlowResponse {
  flow: FlowDefinition;
}

export type UpdateFlowRequest = FlowDefinition;

export interface UpdateFlowResponse {
  flow: FlowDefinition;
}

export interface DeleteFlowResponse {
  flowId: string;
  deleted: boolean;
}

export interface FlowValidationIssue {
  code: string;
  message: string;
  severity: "error" | "warning";
  nodeId?: string;
  edgeId?: string;
}

export interface ValidateFlowResponse {
  valid: boolean;
  errors: FlowValidationIssue[];
  warnings: FlowValidationIssue[];
}
