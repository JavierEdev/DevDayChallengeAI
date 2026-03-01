import type { ValidationRule } from "@devday/shared";

export class RunConversationTurnHelper {
  static formatUnknownError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }

    return String(error);
  }

  static normalizeFieldName(fieldPath: string): string {
    return fieldPath
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");
  }

  static escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  static parseFirstJsonObject(text: string): Record<string, unknown> | null {
    const trimmed = text.trim();
    if (!trimmed) {
      return null;
    }

    const directParsed = RunConversationTurnHelper.safeParseObject(trimmed);
    if (directParsed) {
      return directParsed;
    }

    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return null;
    }

    return RunConversationTurnHelper.safeParseObject(jsonMatch[0]);
  }

  static readVariable(variables: Record<string, unknown>, fieldPath: string): unknown {
    const pathSegments = fieldPath.split(".").map((segment) => segment.trim()).filter(Boolean);
    if (pathSegments.length === 0) {
      return undefined;
    }

    let currentValue: unknown = variables;
    for (const segment of pathSegments) {
      if (typeof currentValue !== "object" || currentValue === null || !(segment in currentValue)) {
        return undefined;
      }

      currentValue = (currentValue as Record<string, unknown>)[segment];
    }

    return currentValue;
  }

  static writeVariable(
    variables: Record<string, unknown>,
    fieldPath: string,
    value: unknown
  ): void {
    const pathSegments = fieldPath.split(".").map((segment) => segment.trim()).filter(Boolean);
    if (pathSegments.length === 0) {
      return;
    }

    let current: Record<string, unknown> = variables;
    for (let index = 0; index < pathSegments.length - 1; index += 1) {
      const segment = pathSegments[index];
      if (!segment) {
        continue;
      }

      const existingValue = current[segment];
      if (typeof existingValue !== "object" || existingValue === null || Array.isArray(existingValue)) {
        current[segment] = {};
      }

      current = current[segment] as Record<string, unknown>;
    }

    const leafKey = pathSegments[pathSegments.length - 1];
    if (!leafKey) {
      return;
    }

    current[leafKey] = value;
  }

  static buildValidatorFailMessage(failedRules: ValidationRule[]): string {
    if (failedRules.length === 0) {
      return "Necesito informacion adicional para continuar.";
    }

    const fields = failedRules.map((rule) => rule.errorMessage ?? `- ${rule.field}`);
    return `Antes de continuar necesito estos datos:\n${fields.join("\n")}`;
  }

  private static safeParseObject(value: string): Record<string, unknown> | null {
    try {
      const parsed = JSON.parse(value);
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }
}
