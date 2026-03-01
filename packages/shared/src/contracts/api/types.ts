import type { RuntimeStatus } from "../runtime/enums.js";
import type { SessionMessage, SessionState, TraceEvent } from "../runtime/types.js";

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
