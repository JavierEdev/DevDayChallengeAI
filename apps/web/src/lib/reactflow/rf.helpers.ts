import type { Connection } from "reactflow";

import type { NodeType as ContractNodeType } from "@shared/contracts/flow/enums";
import { flowDefinitionSchema } from "@shared/contracts/flow/schemas";
import type {
  AgentNodeData,
  FlowDefinition,
  FlowEdge,
  FlowNode,
  ResponseNodeData,
  RouterNodeData,
  StartNodeData,
  ToolNodeData,
  ValidatorNodeData
} from "@shared/contracts/flow/types";

import {
  CONTRACT_NODE_TYPE_BY_UI,
  NODE_TITLE_BY_UI,
  UI_NODE_TYPE_BY_CONTRACT
} from "./rf.defaults";
import type {
  BuilderFlowEdge,
  BuilderFlowNode,
  BuilderFlowSnapshot,
  BuilderNodeData,
  BuilderNodeType
} from "./rf.types";

function randomToken(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID().slice(0, 8);
  }

  return Math.random().toString(36).slice(2, 10);
}

export function createId(prefix: string): string {
  return `${prefix}_${randomToken()}`;
}

export function buildDefaultConfig(nodeType: BuilderNodeType): BuilderNodeData["config"] {
  switch (nodeType) {
    case "start":
      return {
        title: NODE_TITLE_BY_UI.start,
        description: "Punto de inicio del flujo",
        welcomeMessage: "Hola, bienvenido al asistente."
      };
    case "memory":
      return {
        title: NODE_TITLE_BY_UI.memory,
        description: "Punto de entrada al flujo",
        welcomeMessage: "Hola, te ayudo con todo lo relacionado a autos."
      };
    case "orchestrator":
      return {
        title: NODE_TITLE_BY_UI.orchestrator,
        strategy: "intent",
        routes: []
      };
    case "validator":
      return {
        title: NODE_TITLE_BY_UI.validator,
        mode: "all",
        rules: []
      };
    case "specialist":
      return {
        title: NODE_TITLE_BY_UI.specialist,
        instructions:
          "Responde en espanol neutro y prioriza catalogo, financiamiento y agenda.",
        model: "gemini-2.0-flash",
        temperature: 0.4
      };
    case "generic":
      return {
        title: NODE_TITLE_BY_UI.generic,
        messageTemplate: "{{assistant_reply}}",
        endSession: false
      };
    case "tool":
      return {
        title: NODE_TITLE_BY_UI.tool,
        toolName: "faqs",
        inputTemplate: "{{last_user_message}}",
        outputVariable: "tool_context",
        timeoutMs: 3000
      };
    default:
      return {
        title: "Node"
      };
  }
}

export function createBuilderNode(
  type: BuilderNodeType,
  options?: {
    x?: number;
    y?: number;
  }
): BuilderFlowNode {
  const contractType = CONTRACT_NODE_TYPE_BY_UI[type];
  return {
    id: createId(type),
    type,
    position: {
      x: options?.x ?? 120,
      y: options?.y ?? 120
    },
    data: {
      contractType,
      config: buildDefaultConfig(type)
    }
  };
}

function toStartData(config: BuilderNodeData["config"]): StartNodeData {
  const data = config as Partial<StartNodeData>;
  return {
    title: data.title,
    description: data.description,
    welcomeMessage: data.welcomeMessage
  };
}

function toRouterData(config: BuilderNodeData["config"]): RouterNodeData {
  const data = config as Partial<RouterNodeData>;
  return {
    title: data.title,
    description: data.description,
    strategy: data.strategy ?? "intent",
    routes: data.routes ?? [],
    fallbackNodeId: data.fallbackNodeId
  };
}

function toValidatorData(config: BuilderNodeData["config"]): ValidatorNodeData {
  const data = config as Partial<ValidatorNodeData>;
  return {
    title: data.title,
    description: data.description,
    mode: data.mode ?? "all",
    rules: data.rules ?? [],
    onFailNodeId: data.onFailNodeId
  };
}

function toToolData(config: BuilderNodeData["config"]): ToolNodeData {
  const data = config as Partial<ToolNodeData>;
  return {
    title: data.title,
    description: data.description,
    toolName: data.toolName ?? "faqs",
    inputTemplate: data.inputTemplate,
    outputVariable: data.outputVariable,
    timeoutMs: data.timeoutMs
  };
}

function toAgentData(config: BuilderNodeData["config"]): AgentNodeData {
  const data = config as Partial<AgentNodeData>;
  return {
    title: data.title,
    description: data.description,
    instructions: data.instructions ?? "Responde de forma clara y breve.",
    model: data.model,
    temperature: data.temperature
  };
}

function toResponseData(config: BuilderNodeData["config"]): ResponseNodeData {
  const data = config as Partial<ResponseNodeData>;
  return {
    title: data.title,
    description: data.description,
    messageTemplate: data.messageTemplate ?? "{{assistant_reply}}",
    endSession: data.endSession
  };
}

function toContractNode(node: BuilderFlowNode): FlowNode {
  const width = node.width ?? undefined;
  const height = node.height ?? undefined;
  const hasUiState = width !== undefined || height !== undefined || node.selected !== undefined;
  const uiState =
    hasUiState
      ? {
          width,
          height,
          selected: node.selected
        }
      : undefined;

  const baseNode = {
    id: node.id,
    position: node.position,
    ui: uiState
  };

  const contractType = node.data.contractType;
  switch (contractType) {
    case "start":
      return {
        ...baseNode,
        type: "start",
        data: toStartData(node.data.config)
      };
    case "router":
      return {
        ...baseNode,
        type: "router",
        data: toRouterData(node.data.config)
      };
    case "validator":
      return {
        ...baseNode,
        type: "validator",
        data: toValidatorData(node.data.config)
      };
    case "tool":
      return {
        ...baseNode,
        type: "tool",
        data: toToolData(node.data.config)
      };
    case "agent":
      return {
        ...baseNode,
        type: "agent",
        data: toAgentData(node.data.config)
      };
    case "response":
      return {
        ...baseNode,
        type: "response",
        data: toResponseData(node.data.config)
      };
    default:
      return {
        ...baseNode,
        type: "start",
        data: toStartData(node.data.config)
      };
  }
}

function toContractEdge(edge: BuilderFlowEdge): FlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle ?? undefined,
    targetHandle: edge.targetHandle ?? undefined,
    label: edge.label ? String(edge.label) : undefined
  };
}

function toUiNodeType(contractType: ContractNodeType): BuilderNodeType {
  return UI_NODE_TYPE_BY_CONTRACT[contractType];
}

export function toFlowDefinition(snapshot: BuilderFlowSnapshot): FlowDefinition {
  const nodes = snapshot.nodes.map(toContractNode);
  const edges = snapshot.edges.map(toContractEdge);
  const startNode =
    nodes.find((node) => node.type === "start") ?? nodes.find((node) => node.id.length > 0);

  const draft: FlowDefinition = {
    id: snapshot.id,
    name: snapshot.name,
    description: snapshot.description,
    version: snapshot.version,
    startNodeId: startNode?.id ?? "missing_start",
    nodes,
    edges
  };

  return flowDefinitionSchema.parse(draft);
}

export function fromFlowDefinition(flow: FlowDefinition): {
  nodes: BuilderFlowNode[];
  edges: BuilderFlowEdge[];
} {
  const parsed = flowDefinitionSchema.parse(flow);
  const nodes: BuilderFlowNode[] = parsed.nodes.map((node) => ({
    id: node.id,
    type: toUiNodeType(node.type),
    position: node.position,
    data: {
      contractType: node.type,
      config: node.data
    },
    width: node.ui?.width,
    height: node.ui?.height,
    selected: node.ui?.selected
  }));

  const edges: BuilderFlowEdge[] = parsed.edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    label: edge.label
  }));

  return { nodes, edges };
}

export function createConnectionEdge(connection: Connection): BuilderFlowEdge {
  return {
    id: createId("edge"),
    source: connection.source ?? "",
    target: connection.target ?? "",
    sourceHandle: connection.sourceHandle ?? undefined,
    targetHandle: connection.targetHandle ?? undefined
  };
}

export function getNodeDisplayTitle(node: BuilderFlowNode): string {
  const config = node.data.config as { title?: string };
  if (config.title && config.title.trim().length > 0) {
    return config.title;
  }

  const nodeType = node.type ?? "memory";
  return NODE_TITLE_BY_UI[nodeType];
}
