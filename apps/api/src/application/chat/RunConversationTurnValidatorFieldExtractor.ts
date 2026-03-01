import { RunConversationTurnHelper } from "./RunConversationTurnHelper.js";

export class RunConversationTurnValidatorFieldExtractor {
  extractFieldValueByHeuristics(
    fieldPath: string,
    userMessage: string
  ): string | undefined {
    const normalizedFieldName = RunConversationTurnHelper.normalizeFieldName(fieldPath);
    const normalizedUserMessage = RunConversationTurnHelper.normalizeFieldName(userMessage);

    if (normalizedFieldName.includes("tipocliente")) {
      const existingClientTokens = [
        "clienteexistente",
        "clienteactual",
        "yasoycliente",
        "soycliente",
        "yacompreamos",
        "hecompradoantes",
        "clientefrecuente"
      ];
      if (existingClientTokens.some((token) => normalizedUserMessage.includes(token))) {
        return "existente";
      }

      const newClientTokens = [
        "clientenuevo",
        "nuevocliente",
        "primeravez",
        "primeracompra",
        "nuncahecomprado",
        "nosoycliente"
      ];
      if (newClientTokens.some((token) => normalizedUserMessage.includes(token))) {
        return "nuevo";
      }

      if (/\b(cliente\s+(?:existente|actual)|ya\s+soy\s+cliente|cliente\s+actual)\b/i.test(userMessage)) {
        return "existente";
      }
      if (/\b(cliente\s+(?:nuevo|nueva)|nuevo\s+cliente|primera\s+vez|primer\s+compra)\b/i.test(userMessage)) {
        return "nuevo";
      }
    }

    if (normalizedFieldName.includes("situacionlaboral")) {
      if (
        /\b(asalariado|planilla|nomina|nómina|empleado\s+fijo|relacion\s+de\s+dependencia)\b/i.test(
          userMessage
        )
      ) {
        return "asalariado";
      }
      if (
        /\b(independiente|autonomo|autónomo|freelance|negocio\s+propio|por\s+cuenta\s+propia|empresario)\b/i.test(
          userMessage
        )
      ) {
        return "independiente";
      }
    }

    if (normalizedFieldName.includes("nombre")) {
      return userMessage.match(
        /(?:mi nombre es|soy)\s+([A-Za-zÁÉÍÓÚÑáéíóúñ]+(?:\s+[A-Za-zÁÉÍÓÚÑáéíóúñ]+){0,4})/i
      )?.[1]?.trim();
    }

    if (normalizedFieldName.includes("presupuesto")) {
      const explicitBudget = userMessage.match(
        /(?:presupuesto(?:\s+de|\s+es)?|tengo(?:\s+un)?\s+presupuesto(?:\s+de)?)[^\d$QqGgTtUuSsDd]*((?:GTQ|GT|Q|USD|\$)?\s*\d[\d.,]*)/i
      )?.[1];
      if (explicitBudget) {
        return explicitBudget.trim();
      }

      const conversationalBudget = userMessage.match(
        /\b(?:tengo|cuento\s+con|manejo|dispongo\s+de)\s+((?:GTQ|GT|Q|USD|\$)\s*\d[\d.,]*)\b/i
      )?.[1];
      if (conversationalBudget) {
        return conversationalBudget.trim();
      }

      const plainBudget = userMessage.match(
        /\b(?:tengo|cuento\s+con|manejo|dispongo\s+de|presupuesto(?:\s+de|\s+es)?|mi\s+presupuesto(?:\s+de|\s+es)?)\b[^\d]{0,24}((?:\d{1,3}(?:[.,]\d{3})+)|\d{4,})\b/i
      )?.[1];
      if (plainBudget) {
        return plainBudget.trim();
      }

      return userMessage.match(/\b((?:GTQ|GT|Q|USD|\$)\s*\d[\d.,]*)\b/i)?.[1]?.trim();
    }

    if (
      normalizedFieldName.includes("descuentoempleado") ||
      (normalizedFieldName.includes("descuento") && normalizedFieldName.includes("empleado"))
    ) {
      const negativeDiscountTokens = [
        "nodescuentodeempleado",
        "nodescuentoempleado",
        "sindescuentodeempleado",
        "sindescuentoempleado",
        "nodescuento",
        "sindescuento",
        "noaplicadescuento",
        "nosoyempleado"
      ];
      if (negativeDiscountTokens.some((token) => normalizedUserMessage.includes(token))) {
        return "no";
      }

      const positiveDiscountTokens = [
        "tengodescuentodeempleado",
        "tengodescuentoempleado",
        "cuentocondescuentodeempleado",
        "cuentocondescuentoempleado",
        "tengodescuento",
        "cuentocondescuento",
        "siaplicadescuento"
      ];
      if (positiveDiscountTokens.some((token) => normalizedUserMessage.includes(token))) {
        return "si";
      }

      if (
        /\b(?:no\s+tengo|sin|ningun|ningún|no\s+cuento\s+con)\s+(?:descuento(?:\s+de)?(?:\s+empleado)?|descuentoempleado)\b/i.test(
          userMessage
        ) ||
        /\bno\s+descuento(?:\s+de)?(?:\s+empleado)?\b/i.test(userMessage) ||
        /\bno\s+soy\s+empleado\b/i.test(userMessage) ||
        /\bno\s+aplica\s+descuento\b/i.test(userMessage)
      ) {
        return "no";
      }

      if (
        /\b(?:si|sí)\s+(?:tengo|cuento\s+con)\s+(?:descuento(?:\s+de)?(?:\s+empleado)?|descuentoempleado)\b/i.test(
          userMessage
        ) ||
        /\btengo\s+descuento(?:\s+de)?(?:\s+empleado)?\b/i.test(userMessage)
      ) {
        return "si";
      }
    }

    if (normalizedFieldName.includes("condicionvehiculo")) {
      const value = userMessage.match(/\b(nuevo|nueva|usado|usada|seminuevo|semi[-\s]?nuevo)\b/i)?.[1]?.trim();
      if (!value) {
        return undefined;
      }
      return /nuevo/i.test(value) ? "nuevo" : "usado";
    }

    if (normalizedFieldName.includes("vehiculointeres")) {
      if (
        /\b(no\s+aplica|sin\s+vehiculo|sin\s+vehículo|aun\s+no\s+tengo\s+vehiculo|aún\s+no\s+tengo\s+vehículo)\b/i.test(
          userMessage
        )
      ) {
        return "no aplica";
      }

      return userMessage.match(
        /\b(?:me\s+interesa|estoy\s+interesad[oa]\s+en|quiero\s+probar|quiero\s+ver|vehiculo\s+de\s+interes(?:\s+es)?|auto\s+de\s+interes(?:\s+es)?)\s+([A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s-]{3,48})/i
      )?.[1]?.trim();
    }

    if (normalizedFieldName.includes("tipovehiculo") || normalizedFieldName.includes("vehiculo")) {
      return userMessage.match(/\b(sedan|sedán|suv|pickup|pick-up|camioneta|hatchback|coupe|coupé)\b/i)?.[1]?.trim();
    }

    if (normalizedFieldName.includes("fechapreferida") || normalizedFieldName === "fecha") {
      return this.extractDateValueByHeuristics(userMessage);
    }

    if (normalizedFieldName.includes("horapreferida") || normalizedFieldName === "hora") {
      return this.extractTimeValueByHeuristics(userMessage);
    }

    if (normalizedFieldName.includes("motivocita") || normalizedFieldName.includes("motivo")) {
      return this.extractAppointmentReasonByHeuristics(userMessage);
    }

    if (normalizedFieldName.includes("edad")) {
      return (
        userMessage.match(/(?:tengo|edad(?:\s+aproximada)?(?:\s+es)?|soy\s+de)\s*(\d{1,3})\s*(?:anos|años)?/i)?.[1] ??
        userMessage.match(/\b(\d{1,3})\s*(?:anos|años)\b/i)?.[1]
      )?.trim();
    }

    const lastSegment = fieldPath.split(".").pop()?.trim();
    if (!lastSegment) {
      return undefined;
    }

    const directPattern = new RegExp(`${RunConversationTurnHelper.escapeRegExp(lastSegment)}\\s*(?:es|:)\\s*([^,.\\n]+)`, "i");
    return userMessage.match(directPattern)?.[1]?.trim();
  }

  humanizeFieldName(fieldPath: string): string {
    const normalized = fieldPath.split(".").pop()?.trim() ?? fieldPath.trim();
    if (!normalized) {
      return "dato faltante";
    }

    const normalizedKey = normalized.toLowerCase();
    const knownHumanizedLabels: Record<string, string> = {
      tipocliente: "tipo de cliente",
      situacionlaboral: "situacion laboral",
      edadaproximada: "edad aproximada",
      nombrecompleto: "nombre completo",
      fechapreferida: "fecha preferida",
      horapreferida: "hora preferida",
      motivocita: "motivo de la cita",
      vehiculointeres: "vehiculo de interes",
      descuentoempleado: "descuento de empleado",
      tipovehiculo: "tipo de vehiculo",
      condicionvehiculo: "condicion del vehiculo"
    };
    const knownLabel = knownHumanizedLabels[normalizedKey];
    if (knownLabel) {
      return knownLabel;
    }

    return normalized
      .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
      .replace(/[_-]+/g, " ")
      .toLowerCase();
  }

  private extractDateValueByHeuristics(userMessage: string): string | undefined {
    const isoDate = userMessage.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
    if (isoDate) {
      return isoDate;
    }

    const slashDate = userMessage.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (slashDate?.[1] && slashDate[2] && slashDate[3]) {
      return `${slashDate[3]}-${slashDate[2].padStart(2, "0")}-${slashDate[1].padStart(2, "0")}`;
    }

    const normalizedMessage = this.normalizeFreeText(userMessage);
    const today = new Date();
    if (/\bhoy\b/.test(normalizedMessage)) {
      return this.toIsoDate(today);
    }
    if (/\bmanana\b/.test(normalizedMessage)) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      return this.toIsoDate(tomorrow);
    }

    const weekdays: Array<{ token: string; day: number }> = [
      { token: "domingo", day: 0 },
      { token: "lunes", day: 1 },
      { token: "martes", day: 2 },
      { token: "miercoles", day: 3 },
      { token: "jueves", day: 4 },
      { token: "viernes", day: 5 },
      { token: "sabado", day: 6 }
    ];
    for (const weekday of weekdays) {
      if (!normalizedMessage.includes(weekday.token)) {
        continue;
      }

      const daysUntilTarget = (weekday.day - today.getDay() + 7) % 7 || 7;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + daysUntilTarget);
      return this.toIsoDate(targetDate);
    }

    return undefined;
  }

  private extractTimeValueByHeuristics(userMessage: string): string | undefined {
    const twentyFourHour = userMessage.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (twentyFourHour?.[1] && twentyFourHour[2]) {
      return `${twentyFourHour[1].padStart(2, "0")}:${twentyFourHour[2]}`;
    }

    const amPm = userMessage.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/i);
    if (!amPm?.[1] || !amPm[3]) {
      return undefined;
    }

    let hours = Number(amPm[1]);
    const minutes = amPm[2] ?? "00";
    const period = amPm[3].toLowerCase();
    if (period === "pm" && hours < 12) {
      hours += 12;
    } else if (period === "am" && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  private extractAppointmentReasonByHeuristics(userMessage: string): string | undefined {
    const normalizedMessage = this.normalizeFreeText(userMessage);
    if (/\b(prueba\s+de\s+manejo|test\s+drive)\b/.test(normalizedMessage)) {
      return "prueba de manejo";
    }
    if (/\b(asesoria|asesoria|consulta|cotizacion|financiamiento)\b/.test(normalizedMessage)) {
      return "asesoria";
    }

    return undefined;
  }

  private normalizeFreeText(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
}
