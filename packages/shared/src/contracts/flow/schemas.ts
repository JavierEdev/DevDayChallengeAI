import { z } from "zod";

import { idSchema, metadataSchema, timestampSchema } from "../common.js";
import {
  EDGE_KINDS,
  NODE_TYPES,
  ROUTER_STRATEGIES,
  VALIDATION_OPERATORS
} from "./enums.js";

export const nodeTypeSchema = z.enum(NODE_TYPES);
export const routerStrategySchema = z.enum(ROUTER_STRATEGIES);
export const validationOperatorSchema = z.enum(VALIDATION_OPERATORS);
export const edgeKindSchema = z.enum(EDGE_KINDS);
export const validatorModeSchema = z.enum(["all", "any"]);

export const xyPositionSchema = z.object({
  x: z.number(),
  y: z.number()
});

export const nodeUiStateSchema = z.object({
  width: z.number().optional(),
  height: z.number().optional(),
  selected: z.boolean().optional()
});

export const baseNodeDataSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().min(1).optional()
});

export const startNodeDataSchema = baseNodeDataSchema.extend({
  welcomeMessage: z.string().min(1).optional()
});

export const routerRouteSchema = z.object({
  id: idSchema,
  label: z.string().min(1),
  targetNodeId: idSchema,
  matchValue: z.string().min(1).optional()
});

export const routerNodeDataSchema = baseNodeDataSchema.extend({
  strategy: routerStrategySchema,
  routes: z.array(routerRouteSchema),
  fallbackNodeId: idSchema.optional()
});

export const validationRuleSchema = z.object({
  id: idSchema,
  field: z.string().min(1),
  operator: validationOperatorSchema,
  value: z.string().optional(),
  errorMessage: z.string().min(1).optional()
});

export const validatorNodeDataSchema = baseNodeDataSchema.extend({
  rules: z.array(validationRuleSchema),
  mode: validatorModeSchema.optional(),
  onFailNodeId: idSchema.optional()
});

export const toolNodeDataSchema = baseNodeDataSchema.extend({
  toolName: z.string().min(1),
  inputTemplate: z.string().optional(),
  outputVariable: z.string().min(1).optional(),
  timeoutMs: z.number().int().positive().optional()
});

export const agentNodeDataSchema = baseNodeDataSchema.extend({
  instructions: z.string().min(1),
  model: z.string().min(1).optional(),
  temperature: z.number().min(0).max(2).optional()
});

export const responseNodeDataSchema = baseNodeDataSchema.extend({
  messageTemplate: z.string().min(1),
  endSession: z.boolean().optional()
});

const flowNodeBaseSchema = z.object({
  id: idSchema,
  position: xyPositionSchema,
  ui: nodeUiStateSchema.optional(),
  metadata: metadataSchema.optional()
});

export const startFlowNodeSchema = flowNodeBaseSchema.extend({
  type: z.literal("start"),
  data: startNodeDataSchema
});

export const routerFlowNodeSchema = flowNodeBaseSchema.extend({
  type: z.literal("router"),
  data: routerNodeDataSchema
});

export const validatorFlowNodeSchema = flowNodeBaseSchema.extend({
  type: z.literal("validator"),
  data: validatorNodeDataSchema
});

export const toolFlowNodeSchema = flowNodeBaseSchema.extend({
  type: z.literal("tool"),
  data: toolNodeDataSchema
});

export const agentFlowNodeSchema = flowNodeBaseSchema.extend({
  type: z.literal("agent"),
  data: agentNodeDataSchema
});

export const responseFlowNodeSchema = flowNodeBaseSchema.extend({
  type: z.literal("response"),
  data: responseNodeDataSchema
});

export const flowNodeSchema = z.discriminatedUnion("type", [
  startFlowNodeSchema,
  routerFlowNodeSchema,
  validatorFlowNodeSchema,
  toolFlowNodeSchema,
  agentFlowNodeSchema,
  responseFlowNodeSchema
]);

export const flowEdgeSchema = z.object({
  id: idSchema,
  source: idSchema,
  target: idSchema,
  sourceHandle: z.string().min(1).optional(),
  targetHandle: z.string().min(1).optional(),
  label: z.string().optional(),
  kind: edgeKindSchema.optional(),
  condition: z.string().optional(),
  metadata: metadataSchema.optional()
});

export const flowDefinitionSchema = z.object({
  id: idSchema,
  name: z.string().min(1),
  description: z.string().optional(),
  version: z.number().int().nonnegative(),
  startNodeId: idSchema,
  nodes: z.array(flowNodeSchema),
  edges: z.array(flowEdgeSchema),
  metadata: metadataSchema.optional(),
  createdAt: timestampSchema.optional(),
  updatedAt: timestampSchema.optional()
});
