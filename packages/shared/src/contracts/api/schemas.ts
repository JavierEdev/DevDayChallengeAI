import { z } from "zod";

import { idSchema, metadataSchema } from "../common.js";
import { flowDefinitionSchema } from "../flow/schemas.js";
import {
  runtimeStatusSchema,
  sessionMessageSchema,
  sessionStateSchema,
  traceEventSchema
} from "../runtime/schemas.js";

export const createSessionRequestSchema = z.object({
  flowId: idSchema,
  initialVariables: metadataSchema.optional(),
  externalUserId: idSchema.optional()
});

export const createSessionResponseSchema = z.object({
  session: sessionStateSchema,
  status: runtimeStatusSchema,
  trace: z.array(traceEventSchema),
  assistantMessage: sessionMessageSchema.optional()
});

export const sendMessageRequestSchema = z.object({
  sessionId: idSchema,
  message: z.string().min(1),
  metadata: metadataSchema.optional()
});

export const sendMessageResponseSchema = z.object({
  session: sessionStateSchema,
  status: runtimeStatusSchema,
  trace: z.array(traceEventSchema),
  assistantMessage: sessionMessageSchema.optional()
});

export const createFlowRequestSchema = flowDefinitionSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true
});

export const createFlowResponseSchema = z.object({
  flow: flowDefinitionSchema
});

export const getFlowResponseSchema = z.object({
  flow: flowDefinitionSchema
});

export const updateFlowRequestSchema = flowDefinitionSchema;

export const updateFlowResponseSchema = z.object({
  flow: flowDefinitionSchema
});

export const deleteFlowResponseSchema = z.object({
  flowId: idSchema,
  deleted: z.boolean()
});

export const flowValidationSeveritySchema = z.enum(["error", "warning"]);

export const flowValidationIssueSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  severity: flowValidationSeveritySchema,
  nodeId: idSchema.optional(),
  edgeId: idSchema.optional()
});

export const validateFlowResponseSchema = z.object({
  valid: z.boolean(),
  errors: z.array(flowValidationIssueSchema),
  warnings: z.array(flowValidationIssueSchema)
});
