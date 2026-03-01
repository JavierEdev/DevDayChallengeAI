import type {
  SendMessageRequest,
  SessionState,
  ValidationOperator,
  ValidationRule,
  ValidatorNodeData
} from "@devday/shared";

import type { IAgentLlmInvocation, IAgentLlmPort } from "../../domain/agent/IAgentLlmPort.js";
import { RunConversationTurnHelper } from "./RunConversationTurnHelper.js";
import { RunConversationTurnValidatorFieldExtractor } from "./RunConversationTurnValidatorFieldExtractor.js";

const MAX_VALIDATOR_EXTRACTION_FIELDS = 12;
const DEFAULT_VALIDATOR_LLM_EXTRACTION_TIMEOUT_MS = 1_200;
const DEFAULT_VALIDATOR_LLM_FEEDBACK_TIMEOUT_MS = 700;
const MAX_REMAINING_FIELDS_FOR_LLM_EXTRACTION = 3;

type TimeoutRunner = <T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
) => Promise<T>;

export interface IValidatorEvaluation {
  passed: boolean;
  failedRules: ValidationRule[];
}

export class RunConversationTurnValidatorEngine {
  private readonly fieldExtractor = new RunConversationTurnValidatorFieldExtractor();

  constructor(
    private readonly agentLlmPort: IAgentLlmPort,
    private readonly withTimeout: TimeoutRunner,
    private readonly useLlm: boolean = false
  ) {}

  evaluate(validatorNodeData: ValidatorNodeData, variables: Record<string, unknown>): IValidatorEvaluation {
    const runtimeRules = this.resolveRules(validatorNodeData);
    const failedRules = runtimeRules.filter((rule) => !this.passesRule(rule, variables));
    const mode = validatorNodeData.mode ?? "all";

    if (mode === "any") {
      return {
        passed: failedRules.length < runtimeRules.length,
        failedRules
      };
    }

    return {
      passed: failedRules.length === 0,
      failedRules
    };
  }

  resolveRules(validatorNodeData: ValidatorNodeData): ValidationRule[] {
    if (validatorNodeData.rules && validatorNodeData.rules.length > 0) {
      return validatorNodeData.rules;
    }

    const requiredFields = validatorNodeData.requiredFields ?? [];
    return requiredFields.map((field) => ({
      id: `required-${field}`,
      field,
      operator: "exists" as ValidationOperator,
      errorMessage: `Falta el campo requerido: ${field}`
    }));
  }

  async buildMissingFieldsMessage(
    failedRules: ValidationRule[],
    userMessage: SendMessageRequest["message"]
  ): Promise<string> {
    if (failedRules.length === 0) {
      return "Para continuar, me compartes un dato adicional?";
    }

    const failedFieldNames = failedRules.map((rule) => rule.field);
    const fieldLabels = failedFieldNames.map((fieldName) =>
      this.fieldExtractor.humanizeFieldName(fieldName)
    );
    const fallbackMessage = this.buildFriendlyMissingFieldsFallback(fieldLabels);
    if (!this.useLlm) {
      return fallbackMessage;
    }
    if (failedRules.length > 2) {
      return fallbackMessage;
    }

    const llmInvocation: IAgentLlmInvocation = {
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: [
            "Eres un asistente de ventas de autos.",
            "Debes pedir de forma cordial SOLO los datos faltantes.",
            "Usa un tono cercano y family friendly.",
            "Responde en espanol neutro.",
            "Respuesta corta (maximo 2 lineas).",
            "No uses markdown ni listas con simbolos.",
            "No menciones nombres tecnicos de campos."
          ].join(" ")
        },
        {
          role: "user",
          content: [
            `Mensaje del usuario: ${userMessage}`,
            `Campos faltantes (tecnicos): ${failedFieldNames.join(", ")}`,
            `Campos faltantes (humanos): ${fieldLabels.join(", ")}`,
            "Genera una unica respuesta pidiendo esos datos faltantes."
          ].join("\n")
        }
      ]
    };

    try {
      const llmResult = await this.withTimeout(
        this.agentLlmPort.invoke(llmInvocation),
        DEFAULT_VALIDATOR_LLM_FEEDBACK_TIMEOUT_MS,
        `El mensaje del validator excedio ${DEFAULT_VALIDATOR_LLM_FEEDBACK_TIMEOUT_MS}ms`
      );
      const responseText = llmResult.text.trim();
      if (responseText.length === 0) {
        return fallbackMessage;
      }

      const normalizedResponse = responseText.toLowerCase();
      const hasTechnicalFieldNames = failedFieldNames.some((fieldName) =>
        normalizedResponse.includes(fieldName.toLowerCase())
      );
      if (hasTechnicalFieldNames) {
        return fallbackMessage;
      }

      return responseText;
    } catch {
      return fallbackMessage;
    }
  }

  async hydrateVariablesFromText(
    sessionState: SessionState,
    userMessage: SendMessageRequest["message"],
    runtimeRules: ValidationRule[]
  ): Promise<string[]> {
    const candidateFields = Array.from(
      new Set(
        runtimeRules
          .filter((rule) => !this.passesRule(rule, sessionState.variables))
          .map((rule) => rule.field)
      )
    ).slice(0, MAX_VALIDATOR_EXTRACTION_FIELDS);

    if (candidateFields.length === 0) {
      return [];
    }

    const extractedFields = new Set<string>();
    for (const field of candidateFields) {
      const extractedValue = this.fieldExtractor.extractFieldValueByHeuristics(field, userMessage);
      if (extractedValue === undefined || extractedValue === null) {
        continue;
      }

      RunConversationTurnHelper.writeVariable(sessionState.variables, field, extractedValue);
      extractedFields.add(field);
    }

    const remainingFields = candidateFields.filter((field) => !extractedFields.has(field));
    if (remainingFields.length === 0) {
      return Array.from(extractedFields);
    }
    if (!this.useLlm) {
      return Array.from(extractedFields);
    }
    if (remainingFields.length > MAX_REMAINING_FIELDS_FOR_LLM_EXTRACTION) {
      return Array.from(extractedFields);
    }

    try {
      const llmExtractedValues = await this.withTimeout(
        this.extractFieldsWithLlm(userMessage, remainingFields),
        DEFAULT_VALIDATOR_LLM_EXTRACTION_TIMEOUT_MS,
        `La extraccion del validator excedio ${DEFAULT_VALIDATOR_LLM_EXTRACTION_TIMEOUT_MS}ms`
      );
      for (const [field, value] of Object.entries(llmExtractedValues)) {
        if (value === undefined || value === null) {
          continue;
        }

        const normalizedValue = typeof value === "string" ? value.trim() : String(value);
        if (!normalizedValue) {
          continue;
        }

        RunConversationTurnHelper.writeVariable(sessionState.variables, field, normalizedValue);
        extractedFields.add(field);
      }
    } catch {
      // Si el extractor por LLM falla, se mantiene la validacion normal sin romper el flujo.
    }

    return Array.from(extractedFields);
  }

  private async extractFieldsWithLlm(
    userMessage: SendMessageRequest["message"],
    fields: string[]
  ): Promise<Record<string, string | number | boolean | null>> {
    if (fields.length === 0) {
      return {};
    }

    const llmInvocation: IAgentLlmInvocation = {
      temperature: 0,
      messages: [
        {
          role: "system",
          content: [
            "Extrae datos estructurados de un mensaje de usuario.",
            "Responde unicamente con JSON valido.",
            "Usa exactamente las llaves solicitadas.",
            "Si no encuentras un valor, usa null.",
            "No incluyas markdown ni texto adicional."
          ].join(" ")
        },
        {
          role: "user",
          content: [
            `Llaves a extraer: ${fields.join(", ")}`,
            `Mensaje: ${userMessage}`
          ].join("\n")
        }
      ]
    };

    const llmResult = await this.agentLlmPort.invoke(llmInvocation);
    const parsedObject = RunConversationTurnHelper.parseFirstJsonObject(llmResult.text);
    if (!parsedObject) {
      return {};
    }

    const normalizedEntryMap = new Map<string, unknown>();
    for (const [key, value] of Object.entries(parsedObject)) {
      normalizedEntryMap.set(RunConversationTurnHelper.normalizeFieldName(key), value);
    }

    const output: Record<string, string | number | boolean | null> = {};
    for (const field of fields) {
      const value =
        parsedObject[field] ??
        normalizedEntryMap.get(RunConversationTurnHelper.normalizeFieldName(field));
      if (
        value === null ||
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        output[field] = value;
      }
    }

    return output;
  }

  private passesRule(rule: ValidationRule, variables: Record<string, unknown>): boolean {
    const fieldValue = RunConversationTurnHelper.readVariable(variables, rule.field);
    if (rule.operator === "exists") {
      if (fieldValue === null || fieldValue === undefined) {
        return false;
      }
      if (typeof fieldValue === "string") {
        return fieldValue.trim().length > 0;
      }
      if (Array.isArray(fieldValue)) {
        return fieldValue.length > 0;
      }
      return true;
    }

    if (rule.operator === "equals") {
      if (rule.value === undefined || fieldValue === undefined || fieldValue === null) {
        return false;
      }

      if (typeof fieldValue === "string") {
        return fieldValue.toLowerCase() === rule.value.toLowerCase();
      }
      return String(fieldValue) === rule.value;
    }

    if (rule.operator === "contains") {
      if (rule.value === undefined || fieldValue === undefined || fieldValue === null) {
        return false;
      }

      if (typeof fieldValue === "string") {
        return fieldValue.toLowerCase().includes(rule.value.toLowerCase());
      }

      if (Array.isArray(fieldValue)) {
        const normalizedValues = fieldValue.map((item) => String(item).toLowerCase());
        return normalizedValues.includes(rule.value.toLowerCase());
      }

      return false;
    }

    if (rule.operator === "regex") {
      if (rule.value === undefined || typeof fieldValue !== "string") {
        return false;
      }

      try {
        return new RegExp(rule.value).test(fieldValue);
      } catch {
        return false;
      }
    }

    return false;
  }

  private buildFriendlyMissingFieldsFallback(fieldLabels: string[]): string {
    if (fieldLabels.length === 0) {
      return "Para continuar, me compartes un dato adicional?";
    }

    if (fieldLabels.length === 1) {
      return `Para continuar, me compartes tu ${fieldLabels[0]}?`;
    }

    const labels = [...fieldLabels];
    const lastLabel = labels.pop();
    const head = labels.join(", ");
    return `Para continuar, me ayudas con estos datos: ${head} y ${lastLabel}?`;
  }
}
