import type {
  RuntimeStatus,
  SessionRole,
  TraceEventType
} from "./enums.js";

export interface SessionMessage {
  id: string;
  role: SessionRole;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

export interface ExecutionState {
  currentNodeId?: string;
  nextNodeId?: string;
  visitedNodeIds: string[];
  stepCount: number;
  startedAt: string;
  updatedAt: string;
  lastError?: string;
}

export interface SessionState {
  id: string;
  flowId: string;
  status: RuntimeStatus;
  variables: Record<string, unknown>;
  messages: SessionMessage[];
  execution: ExecutionState;
  createdAt: string;
  updatedAt: string;
}

export interface TraceEvent {
  id: string;
  sessionId: string;
  type: TraceEventType;
  timestamp: string;
  nodeId?: string;
  edgeId?: string;
  message?: string;
  payload?: Record<string, unknown>;
}
