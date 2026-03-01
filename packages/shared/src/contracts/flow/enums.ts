export const NODE_TYPES = [
  "start",
  "router",
  "validator",
  "tool",
  "agent",
  "response"
] as const;

export type NodeType = (typeof NODE_TYPES)[number];

export const ROUTER_STRATEGIES = ["intent", "rule"] as const;
export type RouterStrategy = (typeof ROUTER_STRATEGIES)[number];

export const VALIDATION_OPERATORS = [
  "exists",
  "equals",
  "contains",
  "regex"
] as const;
export type ValidationOperator = (typeof VALIDATION_OPERATORS)[number];

export const EDGE_KINDS = ["default", "condition", "fallback"] as const;
export type EdgeKind = (typeof EDGE_KINDS)[number];
