import { z } from "zod";

import { idSchema, metadataSchema, timestampSchema } from "../common.js";
import {
  RUNTIME_STATUSES,
  SESSION_ROLES,
  TRACE_EVENT_TYPES
} from "./enums.js";

export const runtimeStatusSchema = z.enum(RUNTIME_STATUSES);
export const sessionRoleSchema = z.enum(SESSION_ROLES);
export const traceEventTypeSchema = z.enum(TRACE_EVENT_TYPES);

export const sessionMessageSchema = z.object({
  id: idSchema,
  role: sessionRoleSchema,
  content: z.string(),
  createdAt: timestampSchema,
  metadata: metadataSchema.optional()
});

export const executionStateSchema = z.object({
  currentNodeId: idSchema.optional(),
  nextNodeId: idSchema.optional(),
  visitedNodeIds: z.array(idSchema),
  stepCount: z.number().int().nonnegative(),
  startedAt: timestampSchema,
  updatedAt: timestampSchema,
  lastError: z.string().optional()
});

export const sessionStateSchema = z.object({
  id: idSchema,
  flowId: idSchema,
  status: runtimeStatusSchema,
  variables: metadataSchema,
  messages: z.array(sessionMessageSchema),
  execution: executionStateSchema,
  createdAt: timestampSchema,
  updatedAt: timestampSchema
});

export const traceEventSchema = z.object({
  id: idSchema,
  sessionId: idSchema,
  type: traceEventTypeSchema,
  timestamp: timestampSchema,
  nodeId: idSchema.optional(),
  edgeId: idSchema.optional(),
  message: z.string().optional(),
  payload: metadataSchema.optional()
});
