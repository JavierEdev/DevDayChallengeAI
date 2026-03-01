import type { AgentNodeData, FlowDefinition, SessionState } from "@devday/shared";

import type { IAgentLlmMessage } from "../../domain/agent/IAgentLlmPort.js";
import type { IToolDataset } from "../../domain/tool/IToolRepository.js";
import { TextUtils } from "../common/TextUtils.js";
import { RunConversationTurnHelper } from "./RunConversationTurnHelper.js";
import { RunConversationTurnSpecialistResponseBuilder } from "./RunConversationTurnSpecialistResponseBuilder.js";

export interface IRunConversationTurnAgentComposerOptions {
  maxToolContextRecords: number;
  maxToolContextContentChars: number;
  maxMessageHistory: number;
  directToolResultLimit: number;
  lastAgentResponseVariable: string;
}

export interface ISpecialistPolishInput {
  userMessage: string;
  agentInstructions: string;
  rawJsonResponse: string;
  variables: Record<string, unknown>;
}

export class RunConversationTurnAgentComposer {
  private readonly specialistResponseBuilder: RunConversationTurnSpecialistResponseBuilder;

  constructor(private readonly options: IRunConversationTurnAgentComposerOptions) {
    this.specialistResponseBuilder = new RunConversationTurnSpecialistResponseBuilder({
      directToolResultLimit: options.directToolResultLimit
    });
  }

  buildLlmMessages(
    sessionState: SessionState,
    flowDefinition: FlowDefinition,
    agentNodeData: AgentNodeData,
    runtimeToolDatasets: IToolDataset[]
  ): IAgentLlmMessage[] {
    const toolContext = this.buildToolContext(runtimeToolDatasets);
    const variableContext = this.buildVariableContext(sessionState.variables);
    const messages: IAgentLlmMessage[] = [
      {
        role: "system",
        content: this.buildSystemPrompt(flowDefinition, agentNodeData, toolContext, variableContext)
      }
    ];

    const recentMessages = sessionState.messages.slice(-this.options.maxMessageHistory);
    for (const message of recentMessages) {
      messages.push({
        role: message.role,
        content: message.content
      });
    }

    return messages;
  }

  buildResponseText(
    messageTemplate: string,
    variables: Record<string, unknown>
  ): string {
    const renderedTemplate = messageTemplate
      .replace(/\{\{\s*([^}]+)\s*\}\}/g, (_, fieldPath) => {
        const value = RunConversationTurnHelper.readVariable(variables, String(fieldPath));
        if (value === undefined || value === null) {
          return "";
        }
        return typeof value === "string" ? value : JSON.stringify(value);
      })
      .trim();

    const lastAgentResponse = RunConversationTurnHelper.readVariable(
      variables,
      this.options.lastAgentResponseVariable
    );
    if (!messageTemplate.includes("{{") && typeof lastAgentResponse === "string") {
      return `${renderedTemplate}\n\n${lastAgentResponse}`.trim();
    }

    if (renderedTemplate.length > 0) {
      return renderedTemplate;
    }
    if (typeof lastAgentResponse === "string" && lastAgentResponse.length > 0) {
      return lastAgentResponse;
    }
    return "No se pudo generar una respuesta.";
  }

  buildSpecialistPolishMessages(input: ISpecialistPolishInput): IAgentLlmMessage[] {
    const profileSummary = this.specialistResponseBuilder.buildClientProfileSummary(input.variables);
    const promptLines = [
      "Consulta del usuario:",
      input.userMessage,
      profileSummary ? `Perfil validado: ${profileSummary}` : "",
      `Instrucciones del agente: ${input.agentInstructions}`,
      "Respuesta base (fuente JSON):",
      input.rawJsonResponse,
      "Reescribe la respuesta para que suene natural, clara y amable."
    ].filter(Boolean);

    return [
      {
        role: "system",
        content: [
          "Eres un agente especialista en concesionaria.",
          "Debes mejorar redaccion y tono de una respuesta que viene de JSON.",
          "No cambies cifras, fechas, horarios, precios ni nombres de modelos.",
          "No agregues informacion nueva y no inventes datos.",
          "Responde en espanol neutro, sin markdown y maximo 6 lineas."
        ].join(" ")
      },
      {
        role: "user",
        content: promptLines.join("\n")
      }
    ];
  }

  tryBuildDirectToolResponse(
    userMessage: string,
    datasets: IToolDataset[],
    variables: Record<string, unknown> = {}
  ): string | null {
    return this.specialistResponseBuilder.buildDirectToolResponse(userMessage, datasets, variables);
  }

  buildGenericFallbackResponse(userMessage: string): string {
    const normalizedMessage = TextUtils.shared.normalizeFreeText(userMessage);
    if (/\b(hola|buenas|que tal|hey)\b/.test(normalizedMessage)) {
      return "Hola, con gusto te ayudo. Si quieres, te apoyo con preguntas generales, catalogo o agendamiento.";
    }
    if (/\b(gracias|muchas gracias)\b/.test(normalizedMessage)) {
      return "Con gusto. Cuando quieras, seguimos.";
    }
    return "Puedo ayudarte con temas de la concesionaria, catalogo de vehiculos y agendamiento de citas.";
  }

  buildSpecialistFallbackResponse(): string {
    return "Puedo ayudarte con consultas generales, catalogo de vehiculos y disponibilidad de citas. Indica el tema que quieres resolver.";
  }

  private buildSystemPrompt(
    flowDefinition: FlowDefinition,
    agentNodeData: AgentNodeData,
    toolContext: string,
    variableContext: string
  ): string {
    const isGenericAgent = agentNodeData.label?.trim().toLowerCase() === "generic";
    const basePrompt = [
      "Eres un asistente de una concesionaria de autos.",
      "Responde siempre en espanol neutro, de forma clara y breve.",
      isGenericAgent
        ? "Eres el agente generico conversacional: atiende saludos y mensajes fuera del alcance del negocio."
        : "Eres el agente especialista: responde con base en los datasets de FAQs, catalogo y agenda.",
      isGenericAgent
        ? "No inventes datos de catalogo, FAQs o agenda."
        : "Usa solo la informacion disponible en el contexto y en el historial de mensajes.",
      "Responde estrictamente solo lo que el usuario pregunto.",
      `Flujo actual: ${flowDefinition.name}.`
    ].join(" ");

    const promptSections: string[] = [basePrompt, `Instrucciones del agente: ${agentNodeData.instructions}`];
    if (variableContext) {
      promptSections.push(`Variables de sesion:\n${variableContext}`);
    }
    if (toolContext) {
      promptSections.push(`Contexto de negocio:\n${toolContext}`);
    }
    return promptSections.join("\n\n");
  }

  private buildToolContext(datasets: IToolDataset[]): string {
    const lines: string[] = [];
    for (const dataset of datasets) {
      lines.push(`[${dataset.name}] ${dataset.description}`);
      for (const record of dataset.records.slice(0, this.options.maxToolContextRecords)) {
        lines.push(
          `- ${record.title}: ${TextUtils.shared.clampText(record.content, this.options.maxToolContextContentChars)}`
        );
      }
    }
    return lines.join("\n");
  }

  private buildVariableContext(variables: Record<string, unknown>): string {
    const knownFields = [
      "tipoCliente",
      "situacionLaboral",
      "edadAproximada",
      "presupuesto",
      "condicionVehiculo",
      "descuentoEmpleado",
      "tipoVehiculo",
      "nombreCompleto",
      "fechaPreferida",
      "horaPreferida",
      "motivoCita",
      "vehiculoInteres"
    ];

    return knownFields
      .map((field) => {
        const value = RunConversationTurnHelper.readVariable(variables, field);
        if (value === undefined || value === null) {
          return null;
        }
        const text = typeof value === "string" ? value.trim() : String(value);
        return text ? `${field}: ${text}` : null;
      })
      .filter((line): line is string => Boolean(line))
      .join("\n");
  }

}
