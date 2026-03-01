export const RUNTIME_STATUSES = [
  "idle",
  "running",
  "waiting_input",
  "completed",
  "failed"
] as const;

export type RuntimeStatus = (typeof RUNTIME_STATUSES)[number];

export const SESSION_ROLES = ["user", "assistant", "system"] as const;
export type SessionRole = (typeof SESSION_ROLES)[number];

export const TRACE_EVENT_TYPES = [
  "session_started",
  "message_received",
  "node_entered",
  "node_completed",
  "route_selected",
  "validation_failed",
  "tool_called",
  "agent_responded",
  "response_generated",
  "session_completed",
  "runtime_error"
] as const;

export type TraceEventType = (typeof TRACE_EVENT_TYPES)[number];
