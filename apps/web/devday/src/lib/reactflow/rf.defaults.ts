import type { NodeType as ContractNodeType } from "@shared/contracts/flow/enums";
import type { FlowDefinition } from "@shared/contracts/flow/types";

import type { BuilderNodeType, NodePaletteItem } from "./rf.types";

export const DEFAULT_FLOW_ID = "flow-devday-main";
export const DEFAULT_FLOW_NAME = "Asistente Concesionaria";
export const DEFAULT_FLOW_DESCRIPTION =
  "Flujo base para ventas, soporte y agendamiento de pruebas de manejo.";

export const CONTRACT_NODE_TYPE_BY_UI: Record<BuilderNodeType, ContractNodeType> = {
  memory: "start",
  orchestrator: "router",
  validator: "validator",
  specialist: "agent",
  generic: "response",
  tool: "tool"
};

export const UI_NODE_TYPE_BY_CONTRACT: Record<ContractNodeType, BuilderNodeType> = {
  start: "memory",
  router: "orchestrator",
  validator: "validator",
  tool: "tool",
  agent: "specialist",
  response: "generic"
};

export const NODE_TITLE_BY_UI: Record<BuilderNodeType, string> = {
  memory: "Memory",
  orchestrator: "Orchestrator",
  validator: "Validator",
  specialist: "Specialist",
  generic: "Generic",
  tool: "Tool"
};

export const NODE_SUBTITLE_BY_UI: Record<BuilderNodeType, string> = {
  memory: "Nodo de inicio y contexto",
  orchestrator: "Ruteo por reglas/intenciones",
  validator: "Validaciones de entrada",
  specialist: "Agente especializado",
  generic: "Respuesta final al usuario",
  tool: "Consumo de dataset JSON"
};

const NODE_PALETTE_ORDER: BuilderNodeType[] = [
  "memory",
  "orchestrator",
  "validator",
  "specialist",
  "generic",
  "tool"
];

export const NODE_PALETTE_ITEMS: NodePaletteItem[] = NODE_PALETTE_ORDER.map((type) => ({
  type,
  title: NODE_TITLE_BY_UI[type],
  subtitle: NODE_SUBTITLE_BY_UI[type],
  contractType: CONTRACT_NODE_TYPE_BY_UI[type]
}));

export const STARTER_FLOW_DEFINITION: FlowDefinition = {
  id: DEFAULT_FLOW_ID,
  name: DEFAULT_FLOW_NAME,
  description: DEFAULT_FLOW_DESCRIPTION,
  version: 1,
  startNodeId: "start_1",
  nodes: [
    {
      id: "start_1",
      type: "start",
      position: { x: 60, y: 120 },
      data: {
        title: "Inicio",
        description: "Nodo de arranque del flujo",
        welcomeMessage: "Hola, soy tu asistente de concesionaria."
      }
    },
    {
      id: "agent_1",
      type: "agent",
      position: { x: 340, y: 120 },
      data: {
        title: "Especialista Ventas",
        description: "Agente principal de conversación",
        instructions:
          "Ayuda al usuario con dudas de catálogo, financiamiento y pruebas de manejo.",
        model: "gemini-2.0-flash",
        temperature: 0.4
      }
    },
    {
      id: "response_1",
      type: "response",
      position: { x: 640, y: 120 },
      data: {
        title: "Respuesta",
        description: "Salida hacia el usuario",
        messageTemplate: "{{assistant_reply}}",
        endSession: false
      }
    }
  ],
  edges: [
    {
      id: "edge_start_agent",
      source: "start_1",
      target: "agent_1",
      kind: "default"
    },
    {
      id: "edge_agent_response",
      source: "agent_1",
      target: "response_1",
      kind: "default"
    }
  ]
};
