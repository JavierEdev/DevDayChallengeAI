import type { Connection } from "reactflow";

import { flowDefinitionSchema } from "@shared/contracts/flow/schemas";
import type {
  AgentNodeData,
  FlowDefinition,
  FlowEdge,
  FlowNode,
  MemoryNodeData,
  ResponseNodeData,
  RouterRoute,
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
        description: "Lee o guarda contexto de la sesion",
        mode: "read",
        instructions: "Recupera el contexto reciente de la conversacion."
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
        requiredFields: []
      };
    case "specialist":
      return {
        title: NODE_TITLE_BY_UI.specialist,
        label: "specialist",
        instructions:
          "Responde en espanol neutro y prioriza catalogo, financiamiento y agenda.",
        model: "gemini-3-flash",
        temperature: 0.4
      };
    case "generic":
      return {
        title: NODE_TITLE_BY_UI.generic,
        label: "generic",
        instructions:
          "Responde saludos, despedidas y mensajes fuera del alcance de forma amable y breve.",
        model: "gemini-3-flash",
        temperature: 0.3
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

function toMemoryData(config: BuilderNodeData["config"]): MemoryNodeData {
  const data = config as Partial<MemoryNodeData>;
  return {
    title: data.title,
    description: data.description,
    mode: data.mode ?? "read",
    instructions: data.instructions
  };
}

function toRouterData(
  config: BuilderNodeData["config"],
  inferredRoutes: RouterRoute[]
): RouterNodeData {
  const data = config as Partial<RouterNodeData>;
  const configuredRoutes = Array.isArray(data.routes) ? data.routes : [];
  return {
    title: data.title,
    description: data.description,
    strategy: data.strategy ?? "intent",
    instructions: data.instructions,
    routes: configuredRoutes.length > 0 ? configuredRoutes : inferredRoutes,
    fallbackNodeId: data.fallbackNodeId
  };
}

function toValidatorData(config: BuilderNodeData["config"]): ValidatorNodeData {
  const data = config as Partial<ValidatorNodeData>;
  const validatorData: ValidatorNodeData = {
    title: data.title,
    description: data.description,
    instructions: data.instructions,
    mode: data.mode ?? "all",
    onFailNodeId: data.onFailNodeId,
    onCompleteTargetNodeId: data.onCompleteTargetNodeId
  };

  if (Array.isArray(data.requiredFields) && data.requiredFields.length > 0) {
    validatorData.requiredFields = data.requiredFields;
  }

  if (Array.isArray(data.rules) && data.rules.length > 0) {
    validatorData.rules = data.rules;
  }

  return validatorData;
}

function toToolData(config: BuilderNodeData["config"]): ToolNodeData {
  const data = config as Partial<ToolNodeData>;
  return {
    title: data.title,
    description: data.description,
    toolType: data.toolType,
    source: data.source,
    toolName: data.toolName ?? "faqs",
    availableCollections: data.availableCollections,
    instructions: data.instructions,
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
    label: data.label,
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

function normalizeRouteKey(value: string, index: number): string {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (normalized.length > 0) {
    return normalized;
  }

  return `route_${index + 1}`;
}

function inferRouterRoutes(sourceNodeId: string, edges: BuilderFlowEdge[]): RouterRoute[] {
  const outgoingEdges = edges.filter((edge) => edge.source === sourceNodeId);
  return outgoingEdges.map((edge, index) => {
    const rawLabel = edge.label ? String(edge.label).trim() : "";
    const label = rawLabel || `Ruta ${index + 1}`;
    const route: RouterRoute = {
      id: edge.id,
      key: normalizeRouteKey(rawLabel || edge.target, index),
      label,
      targetNodeId: edge.target
    };

    if (rawLabel) {
      route.matchValue = rawLabel.toLowerCase();
    }

    return route;
  });
}

function toContractNode(node: BuilderFlowNode, edges: BuilderFlowEdge[]): FlowNode {
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
    case "memory":
      return {
        ...baseNode,
        type: "memory",
        data: toMemoryData(node.data.config)
      };
    case "router":
      return {
        ...baseNode,
        type: "router",
        data: toRouterData(node.data.config, inferRouterRoutes(node.id, edges))
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

function toUiNodeType(node: FlowNode): BuilderNodeType {
  if (node.type === "agent") {
    const label = node.data.label?.toLowerCase().trim();
    if (label === "generic") {
      return "generic";
    }

    return "specialist";
  }

  return UI_NODE_TYPE_BY_CONTRACT[node.type];
}

export function toFlowDefinition(snapshot: BuilderFlowSnapshot): FlowDefinition {
  const nodes = snapshot.nodes.map((node) => toContractNode(node, snapshot.edges));
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
    type: toUiNodeType(node),
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
