import type {
  EdgeKind,
  MemoryMode,
  NodeType,
  RouterStrategy,
  ValidationOperator
} from "./enums.js";

export interface XYPosition {
  x: number;
  y: number;
}

export interface NodeUIState {
  width?: number;
  height?: number;
  selected?: boolean;
}

export interface BaseNodeData {
  title?: string;
  description?: string;
  label?: string;
}

export interface StartNodeData extends BaseNodeData {
  welcomeMessage?: string;
}

export interface MemoryNodeData extends BaseNodeData {
  mode: MemoryMode;
  instructions?: string;
}

export interface RouterRoute {
  id?: string;
  key?: string;
  label: string;
  targetNodeId: string;
  matchValue?: string;
}

export interface RouterNodeData extends BaseNodeData {
  strategy?: RouterStrategy;
  instructions?: string;
  routes: RouterRoute[];
  fallbackNodeId?: string;
}

export interface ValidationRule {
  id: string;
  field: string;
  operator: ValidationOperator;
  value?: string;
  errorMessage?: string;
}

export interface ValidatorNodeData extends BaseNodeData {
  instructions?: string;
  rules?: ValidationRule[];
  requiredFields?: string[];
  mode?: "all" | "any";
  onFailNodeId?: string;
  onCompleteTargetNodeId?: string;
}

export interface ToolNodeData extends BaseNodeData {
  toolName?: string;
  toolType?: string;
  source?: string;
  availableCollections?: string[];
  instructions?: string;
  inputTemplate?: string;
  outputVariable?: string;
  timeoutMs?: number;
}

export interface AgentNodeData extends BaseNodeData {
  instructions: string;
  model?: string;
  temperature?: number;
}

export interface ResponseNodeData extends BaseNodeData {
  messageTemplate: string;
  endSession?: boolean;
}

export interface FlowNodeDataByType {
  start: StartNodeData;
  memory: MemoryNodeData;
  router: RouterNodeData;
  validator: ValidatorNodeData;
  tool: ToolNodeData;
  agent: AgentNodeData;
  response: ResponseNodeData;
}

export type FlowNodeData = FlowNodeDataByType[NodeType];

interface FlowNodeBase<TNodeType extends NodeType> {
  id: string;
  type: TNodeType;
  position: XYPosition;
  data: FlowNodeDataByType[TNodeType];
  ui?: NodeUIState;
  metadata?: Record<string, unknown>;
}

export type FlowNode = {
  [TNodeType in NodeType]: FlowNodeBase<TNodeType>;
}[NodeType];

export interface FlowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string;
  targetHandle?: string;
  label?: string;
  kind?: EdgeKind;
  condition?: string;
  metadata?: Record<string, unknown>;
}

export interface FlowDefinition {
  id: string;
  name: string;
  description?: string;
  version: number;
  startNodeId: string;
  nodes: FlowNode[];
  edges: FlowEdge[];
  metadata?: Record<string, unknown>;
  createdAt?: string;
  updatedAt?: string;
}
