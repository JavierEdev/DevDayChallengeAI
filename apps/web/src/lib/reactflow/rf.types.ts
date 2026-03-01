import type { Node, Edge } from "reactflow";

import type { NodeType as ContractNodeType } from "@shared/contracts/flow/enums";
import type {
  AgentNodeData,
  FlowNodeData,
  ResponseNodeData,
  RouterNodeData,
  StartNodeData,
  ToolNodeData,
  ValidatorNodeData
} from "@shared/contracts/flow/types";

export const BUILDER_NODE_TYPES = [
  "start",
  "memory",
  "orchestrator",
  "validator",
  "specialist",
  "generic",
  "tool"
] as const;

export type BuilderNodeType = (typeof BUILDER_NODE_TYPES)[number];

export const BUILDER_NODE_DND_MIME = "application/x-devday-builder-node";

export interface BuilderNodeData {
  contractType: ContractNodeType;
  config: FlowNodeData;
}

export type BuilderFlowNode = Node<BuilderNodeData, BuilderNodeType>;
export type BuilderFlowEdge = Edge;

export type BuilderNodeConfigByType = {
  start: StartNodeData;
  memory: StartNodeData;
  orchestrator: RouterNodeData;
  validator: ValidatorNodeData;
  specialist: AgentNodeData;
  generic: ResponseNodeData;
  tool: ToolNodeData;
};

export interface BuilderFlowSnapshot {
  id: string;
  name: string;
  description?: string;
  version: number;
  nodes: BuilderFlowNode[];
  edges: BuilderFlowEdge[];
}

export interface NodePaletteItem {
  type: BuilderNodeType;
  title: string;
  subtitle: string;
  contractType: ContractNodeType;
}

export function isBuilderNodeType(value: string): value is BuilderNodeType {
  return BUILDER_NODE_TYPES.includes(value as BuilderNodeType);
}
