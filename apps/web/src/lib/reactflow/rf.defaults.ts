import type { NodeType as ContractNodeType } from "@shared/contracts/flow/enums";
import type { FlowDefinition } from "@shared/contracts/flow/types";

import type { BuilderNodeType, NodePaletteItem } from "./rf.types";

export const DEFAULT_FLOW_ID = "flow-devday-main";
export const DEFAULT_FLOW_NAME = "Asistente Concesionaria";
export const DEFAULT_FLOW_DESCRIPTION =
  "Flujo base con router principal, validadores por caso de uso y especialistas sobre JSON.";

export const CONTRACT_NODE_TYPE_BY_UI: Record<BuilderNodeType, ContractNodeType> = {
  start: "start",
  memory: "memory",
  orchestrator: "router",
  validator: "validator",
  specialist: "agent",
  generic: "agent",
  tool: "tool"
};

export const UI_NODE_TYPE_BY_CONTRACT: Record<ContractNodeType, BuilderNodeType> = {
  start: "start",
  memory: "memory",
  router: "orchestrator",
  validator: "validator",
  tool: "tool",
  agent: "specialist",
  response: "generic"
};

export const NODE_TITLE_BY_UI: Record<BuilderNodeType, string> = {
  start: "Start",
  memory: "Memory",
  orchestrator: "Orchestrator",
  validator: "Validator",
  specialist: "Specialist",
  generic: "Generic",
  tool: "Tool"
};

export const NODE_SUBTITLE_BY_UI: Record<BuilderNodeType, string> = {
  start: "Nodo de inicio del flujo",
  memory: "Nodo de inicio y contexto",
  orchestrator: "Ruteo por reglas/intenciones",
  validator: "Validaciones de entrada",
  specialist: "Agente especializado",
  generic: "Agente generico conversacional",
  tool: "Consumo de dataset JSON"
};

const NODE_PALETTE_ORDER: BuilderNodeType[] = [
  "start",
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
      position: { x: 40, y: 300 },
      data: {
        title: "Inicio",
        description: "Nodo de arranque",
        welcomeMessage: "Hola, soy tu asistente de concesionaria."
      }
    },
    {
      id: "router_principal",
      type: "router",
      position: { x: 300, y: 300 },
      data: {
        title: "Router Principal",
        description: "Rutea intencion a FAQ, catalogo, agenda o fallback.",
        strategy: "intent",
        instructions: "Selecciona la ruta por intencion principal del mensaje.",
        fallbackNodeId: "response_fallback",
        routes: [
          {
            id: "route_general_info",
            key: "general_info",
            label: "general_info",
            targetNodeId: "validator_faq",
            matchValue:
              "horario|ubicacion|ubicación|financiamiento|garantia|garantía|compra|proceso|faq|pregunta general"
          },
          {
            id: "route_vehicle_catalog",
            key: "vehicle_catalog",
            label: "vehicle_catalog",
            targetNodeId: "validator_catalog",
            matchValue:
              "catalogo|catálogo|vehiculo|vehículo|auto|carro|precio|disponible|modelo|comparar|sedan|suv|pickup"
          },
          {
            id: "route_appointment_booking",
            key: "appointment_booking",
            label: "appointment_booking",
            targetNodeId: "validator_appointment",
            matchValue:
              "cita|agendar|agenda|prueba de manejo|test drive|asesoria|asesoría|fecha|hora|disponibilidad"
          },
          {
            id: "route_fallback",
            key: "fallback",
            label: "fallback",
            targetNodeId: "response_fallback",
            matchValue: "fallback"
          }
        ]
      }
    },
    {
      id: "validator_faq",
      type: "validator",
      position: { x: 620, y: 80 },
      data: {
        title: "Validador FAQs",
        description: "Recopila perfil para consultas generales.",
        instructions:
          "Antes de responder FAQ, valida cliente nuevo/existente, situacion laboral y edad aproximada.",
        mode: "all",
        requiredFields: ["tipoCliente", "situacionLaboral", "edadAproximada"],
        onCompleteTargetNodeId: "agent_specialist_faq"
      }
    },
    {
      id: "agent_specialist_faq",
      type: "agent",
      position: { x: 920, y: 80 },
      data: {
        title: "Especialista FAQs",
        label: "specialist",
        description: "Responde consultas generales con FAQ + perfil.",
        instructions:
          "Responde preguntas generales usando dataset faqs y adapta la respuesta al perfil validado del cliente.",
        model: "gemini-3-flash",
        temperature: 0.3
      }
    },
    {
      id: "response_faq",
      type: "response",
      position: { x: 1240, y: 80 },
      data: {
        title: "Respuesta FAQs",
        description: "Entrega respuesta final del caso FAQ.",
        messageTemplate: "{{lastAgentResponse}}",
        endSession: false
      }
    },
    {
      id: "validator_catalog",
      type: "validator",
      position: { x: 620, y: 300 },
      data: {
        title: "Validador Catalogo",
        description: "Recopila datos de perfil para recomendacion de vehiculos.",
        instructions:
          "Valida presupuesto, condicion, descuento de empleado y tipo de vehiculo antes de recomendar.",
        mode: "all",
        requiredFields: [
          "presupuesto",
          "condicionVehiculo",
          "descuentoEmpleado",
          "tipoVehiculo"
        ],
        onCompleteTargetNodeId: "agent_specialist_catalog"
      }
    },
    {
      id: "agent_specialist_catalog",
      type: "agent",
      position: { x: 920, y: 300 },
      data: {
        title: "Especialista Catalogo",
        label: "specialist",
        description: "Filtra catalogo JSON segun perfil del cliente.",
        instructions:
          "Filtra y recomienda vehiculos usando catalogo JSON y variables validadas del cliente.",
        model: "gemini-3-flash",
        temperature: 0.4
      }
    },
    {
      id: "response_catalog",
      type: "response",
      position: { x: 1240, y: 300 },
      data: {
        title: "Respuesta Catalogo",
        description: "Entrega respuesta final del caso catalogo.",
        messageTemplate: "{{lastAgentResponse}}",
        endSession: false
      }
    },
    {
      id: "validator_appointment",
      type: "validator",
      position: { x: 620, y: 520 },
      data: {
        title: "Validador Cita",
        description: "Recopila datos para agenda de cita.",
        instructions:
          "Valida nombre completo, fecha, hora, motivo y vehiculo de interes antes de consultar agenda.",
        mode: "all",
        requiredFields: [
          "nombreCompleto",
          "fechaPreferida",
          "horaPreferida",
          "motivoCita",
          "vehiculoInteres"
        ],
        onCompleteTargetNodeId: "agent_specialist_agenda"
      }
    },
    {
      id: "agent_specialist_agenda",
      type: "agent",
      position: { x: 920, y: 520 },
      data: {
        title: "Especialista Agenda",
        label: "specialist",
        description: "Consulta agenda y confirma o propone alternativas.",
        instructions:
          "Con variables de cita validadas, consulta dataset agenda y responde confirmando o proponiendo alternativas.",
        model: "gemini-3-flash",
        temperature: 0.3
      }
    },
    {
      id: "response_agenda",
      type: "response",
      position: { x: 1240, y: 520 },
      data: {
        title: "Respuesta Agenda",
        description: "Entrega confirmacion o alternativas de cita.",
        messageTemplate: "{{lastAgentResponse}}",
        endSession: false
      }
    },
    {
      id: "response_fallback",
      type: "response",
      position: { x: 620, y: 700 },
      data: {
        title: "Fallback",
        description: "Respuesta cuando no se detecta intencion valida.",
        messageTemplate:
          "Puedo ayudarte con consultas generales, catalogo de vehiculos o agendamiento de citas. Cual de estos temas quieres resolver?",
        endSession: false
      }
    }
  ],
  edges: [
    {
      id: "edge_start_router",
      source: "start_1",
      target: "router_principal",
      kind: "default"
    },
    {
      id: "edge_router_faq_validator",
      source: "router_principal",
      target: "validator_faq",
      label: "general_info",
      kind: "default"
    },
    {
      id: "edge_router_catalog_validator",
      source: "router_principal",
      target: "validator_catalog",
      label: "vehicle_catalog"
    },
    {
      id: "edge_router_agenda_validator",
      source: "router_principal",
      target: "validator_appointment",
      label: "appointment_booking"
    },
    {
      id: "edge_router_fallback_response",
      source: "router_principal",
      target: "response_fallback",
      label: "fallback",
      kind: "fallback"
    },
    {
      id: "edge_validator_faq_agent",
      source: "validator_faq",
      target: "agent_specialist_faq",
      kind: "default"
    },
    {
      id: "edge_agent_faq_response",
      source: "agent_specialist_faq",
      target: "response_faq",
      kind: "default"
    },
    {
      id: "edge_response_faq_router",
      source: "response_faq",
      target: "router_principal",
      kind: "default"
    },
    {
      id: "edge_validator_catalog_agent",
      source: "validator_catalog",
      target: "agent_specialist_catalog",
      kind: "default"
    },
    {
      id: "edge_agent_catalog_response",
      source: "agent_specialist_catalog",
      target: "response_catalog",
      kind: "default"
    },
    {
      id: "edge_response_catalog_router",
      source: "response_catalog",
      target: "router_principal",
      kind: "default"
    },
    {
      id: "edge_validator_agenda_agent",
      source: "validator_appointment",
      target: "agent_specialist_agenda",
      kind: "default"
    },
    {
      id: "edge_agent_agenda_response",
      source: "agent_specialist_agenda",
      target: "response_agenda",
      kind: "default"
    },
    {
      id: "edge_response_agenda_router",
      source: "response_agenda",
      target: "router_principal",
      kind: "default"
    },
    {
      id: "edge_response_fallback_router",
      source: "response_fallback",
      target: "router_principal",
      kind: "default"
    }
  ]
};
