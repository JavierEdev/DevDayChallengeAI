import type { IToolDataset } from "../../domain/tool/IToolRepository.js";
import { RunConversationTurnHelper } from "./RunConversationTurnHelper.js";

interface ICatalogCandidate {
  record: IToolDataset["records"][number];
  price: number | null;
  mileage: number | null;
  year: number | null;
  vehicleType: string | null;
  condition: "nuevo" | "usado";
}

interface IAgendaDay {
  date: string;
  slots: string[];
}

interface IAgendaSuggestion {
  date: string;
  slot: string;
}

export interface IRunConversationTurnSpecialistResponseBuilderOptions {
  directToolResultLimit: number;
}

export class RunConversationTurnSpecialistResponseBuilder {
  constructor(
    private readonly options: IRunConversationTurnSpecialistResponseBuilderOptions
  ) {}

  buildDirectToolResponse(
    userMessage: string,
    datasets: IToolDataset[],
    variables: Record<string, unknown> = {}
  ): string | null {
    const faqDataset = this.findDatasetByName(datasets, ["faq"]);
    const catalogDataset = this.findDatasetByName(datasets, ["catalogo", "catalog"]);
    const agendaDataset = this.findDatasetByName(datasets, ["agenda"]);
    if (!faqDataset && !catalogDataset && !agendaDataset) {
      return null;
    }

    const normalizedMessage = this.normalizeFreeText(userMessage);
    const queryTokens = this.extractDirectQueryTokens(normalizedMessage);
    const hasAgendaIntent = this.isAgendaIntent(normalizedMessage, variables);
    const hasCatalogIntent = this.isCatalogIntent(normalizedMessage, variables);
    const hasFaqIntent = this.isFaqIntent(normalizedMessage);

    if (agendaDataset?.records.length && hasAgendaIntent) {
      const agendaResponse = this.buildDirectAgendaResponse(userMessage, agendaDataset, variables);
      if (agendaResponse) {
        return agendaResponse;
      }
    }

    if (catalogDataset?.records.length && hasCatalogIntent) {
      const catalogScored = this.scoreDatasetByQueryTokens(catalogDataset, queryTokens);
      const hasDetailIntent =
        /\b(que\s+tiene\s+de\s+bueno|que\s+tiene\s+de\s+malo|caracteristicas|detalles|especificaciones|mas\s+info|mas\s+informacion|informacion\s+(?:de|del|sobre)|dime\s+mas\s+de(?:l|la)?|hablame\s+de|hablame\s+mas\s+de|cuentame\s+de|sobre)\b/.test(
          normalizedMessage
        ) ||
        (/\bque\s+tiene\b/.test(normalizedMessage) && /\b(este|esta|ese|esa)\b/.test(normalizedMessage));
      if (hasDetailIntent && catalogScored.length > 0) {
        return this.buildDirectVehicleDetailResponse(catalogScored[0]?.record);
      }

      const catalogResponse = this.buildDirectCatalogResponse(
        userMessage,
        catalogDataset,
        variables,
        queryTokens
      );
      if (catalogResponse) {
        return catalogResponse;
      }
    }

    if (faqDataset?.records.length && (hasFaqIntent || (!hasCatalogIntent && !hasAgendaIntent))) {
      const faqResponse = this.buildDirectFaqResponse(userMessage, faqDataset, variables, queryTokens);
      if (faqResponse) {
        return faqResponse;
      }
    }

    if (agendaDataset?.records.length) {
      const agendaResponse = this.buildDirectAgendaResponse(userMessage, agendaDataset, variables);
      if (agendaResponse) {
        return agendaResponse;
      }
    }

    if (faqDataset?.records.length) {
      return this.buildDirectFaqResponse(userMessage, faqDataset, variables, queryTokens);
    }

    return null;
  }

  buildClientProfileSummary(variables: Record<string, unknown>): string | null {
    const profileChunks: string[] = [];
    const tipoCliente = this.readFirstString(variables, ["tipoCliente"]);
    const situacionLaboral = this.readFirstString(variables, ["situacionLaboral"]);
    const edadAproximada = this.readFirstString(variables, ["edadAproximada", "edad"]);

    if (tipoCliente) {
      profileChunks.push(`cliente ${tipoCliente}`);
    }
    if (situacionLaboral) {
      profileChunks.push(situacionLaboral);
    }
    if (edadAproximada) {
      profileChunks.push(`edad aproximada ${edadAproximada}`);
    }

    return profileChunks.length > 0 ? profileChunks.join(", ") : null;
  }

  private buildDirectVehicleDetailResponse(
    record: IToolDataset["records"][number] | undefined
  ): string | null {
    if (!record) {
      return null;
    }

    const price = this.extractPriceHint(record.content);
    const summary = this.clampText(record.content, 420);
    const lines = [record.title.trim(), price ? `Precio: ${price}.` : "", summary].filter(Boolean);
    return lines.join("\n");
  }

  private buildDirectFaqResponse(
    userMessage: string,
    faqDataset: IToolDataset,
    variables: Record<string, unknown>,
    queryTokens: string[]
  ): string | null {
    const scored = this.scoreDatasetByQueryTokens(faqDataset, queryTokens);
    const selectedRecord = scored[0]?.record ?? faqDataset.records[0];
    if (!selectedRecord) {
      return null;
    }

    const lines: string[] = [this.sanitizeFaqAnswer(selectedRecord.content)];
    const profileSummary = this.buildClientProfileSummary(variables);
    if (profileSummary) {
      lines.push(`Tome en cuenta tu perfil: ${profileSummary}.`);
    }

    if (/\b(financiamiento|credito|enganche|plazo|mensualidad|tasa|leasing|arrendamiento)\b/.test(
      this.normalizeFreeText(userMessage)
    )) {
      const labor = this.readFirstString(variables, ["situacionLaboral"]);
      const normalizedLabor = this.normalizeFreeText(labor ?? "");
      if (normalizedLabor.includes("asalari")) {
        lines.push("Como asalariado, normalmente te solicitaran comprobantes de ingresos y constancia laboral.");
      } else if (normalizedLabor.includes("independ")) {
        lines.push("Como independiente, suele ayudar presentar estados de cuenta y documentos fiscales recientes.");
      }
    }

    return lines.join("\n");
  }

  private buildDirectCatalogResponse(
    userMessage: string,
    catalogDataset: IToolDataset,
    variables: Record<string, unknown>,
    queryTokens: string[]
  ): string | null {
    const candidates = catalogDataset.records.map((record) => this.toCatalogCandidate(record));
    if (candidates.length === 0) {
      return null;
    }

    const requestedType = this.resolveRequestedVehicleType(variables, userMessage);
    const requestedCondition = this.resolveRequestedVehicleCondition(variables, userMessage);
    const hasEmployeeDiscount = this.resolveEmployeeDiscount(variables);
    const budget = this.resolveBudgetHint(variables, userMessage);
    const effectiveBudget = budget !== null && hasEmployeeDiscount ? Math.round(budget * 1.05) : budget;

    let filtered = [...candidates];
    if (requestedType) {
      const matchingByType = filtered.filter((candidate) => candidate.vehicleType === requestedType);
      filtered = matchingByType.length > 0 ? matchingByType : filtered;
    }
    if (requestedCondition) {
      const matchingByCondition = filtered.filter((candidate) => candidate.condition === requestedCondition);
      filtered = matchingByCondition.length > 0 ? matchingByCondition : filtered;
    }
    if (effectiveBudget !== null) {
      const inBudget = filtered.filter((candidate) => candidate.price !== null && candidate.price <= effectiveBudget);
      filtered = inBudget.length > 0 ? inBudget : filtered;
    }

    const scoreByRecordId = new Map<string, number>(
      this.scoreDatasetByQueryTokens(catalogDataset, queryTokens).map((entry) => [entry.record.id, entry.score])
    );
    filtered.sort((left, right) => {
      const scoreDelta = (scoreByRecordId.get(right.record.id) ?? 0) - (scoreByRecordId.get(left.record.id) ?? 0);
      if (Math.abs(scoreDelta) > 0.001) {
        return scoreDelta;
      }
      if (effectiveBudget !== null) {
        const leftDistance = left.price !== null ? Math.abs(effectiveBudget - left.price) : Number.MAX_SAFE_INTEGER;
        const rightDistance = right.price !== null ? Math.abs(effectiveBudget - right.price) : Number.MAX_SAFE_INTEGER;
        if (leftDistance !== rightDistance) {
          return leftDistance - rightDistance;
        }
      }
      return (left.price ?? Number.MAX_SAFE_INTEGER) - (right.price ?? Number.MAX_SAFE_INTEGER);
    });

    const selected = filtered.slice(0, this.options.directToolResultLimit);
    if (selected.length === 0) {
      return "No encontre opciones exactas con ese perfil. Si quieres, te muestro alternativas cercanas.";
    }

    const lines: string[] = ["Estas opciones se ajustan mejor a lo que buscas:"];
    const profileSummary = this.buildClientProfileSummary(variables);
    if (profileSummary) {
      lines.push(`Tome en cuenta: ${profileSummary}.`);
    }
    if (budget !== null) {
      lines.push(
        hasEmployeeDiscount && effectiveBudget !== null
          ? `Tu presupuesto base es ${this.formatCurrency(budget)} y con descuento de empleado considere hasta ${this.formatCurrency(effectiveBudget)}.`
          : `Tu presupuesto considerado es ${this.formatCurrency(budget)}.`
      );
    }
    if (requestedCondition) {
      lines.push(`Preferencia de condicion: ${requestedCondition}.`);
    }
    if (requestedType) {
      lines.push(`Tipo de vehiculo: ${requestedType}.`);
    }
    for (let index = 0; index < selected.length; index += 1) {
      const candidate = selected[index];
      if (!candidate) {
        continue;
      }
      lines.push(`${index + 1}. ${this.buildHumanReadableCatalogOption(candidate)}`);
    }

    return lines.join("\n");
  }

  private buildDirectAgendaResponse(
    userMessage: string,
    agendaDataset: IToolDataset,
    variables: Record<string, unknown>
  ): string | null {
    const agendaDays = this.parseAgendaDays(agendaDataset);
    if (agendaDays.length === 0) {
      return null;
    }

    const preferredDate = this.resolvePreferredDate(variables, userMessage);
    const preferredTime = this.resolvePreferredTime(variables, userMessage);
    const reason = this.resolveAppointmentReason(variables, userMessage);
    const vehicleInterest = this.resolveVehicleInterest(variables, userMessage);

    if (preferredDate) {
      const preferredDay = agendaDays.find((candidate) => candidate.date === preferredDate);
      if (preferredDay) {
        if (preferredTime) {
          const matchingSlot = preferredDay.slots.find((slot) =>
            this.slotMatchesPreferredTime(slot, preferredTime)
          );
          if (matchingSlot) {
            return this.buildAgendaConfirmation(preferredDate, matchingSlot, reason, vehicleInterest);
          }
        }

        return this.buildAgendaAlternatives(
          preferredDate,
          preferredTime,
          this.buildAgendaSuggestions(agendaDays, preferredDate, 3),
          reason,
          vehicleInterest
        );
      }
    }

    if (preferredTime) {
      const matching = agendaDays
        .flatMap((day) => day.slots.map((slot) => ({ date: day.date, slot })))
        .find((candidate) => this.slotMatchesPreferredTime(candidate.slot, preferredTime));
      if (matching) {
        return this.buildAgendaConfirmation(matching.date, matching.slot, reason, vehicleInterest);
      }
    }

    return this.buildAgendaAlternatives(
      preferredDate,
      preferredTime,
      this.buildAgendaSuggestions(agendaDays, preferredDate, 3),
      reason,
      vehicleInterest
    );
  }

  private buildAgendaConfirmation(
    date: string,
    slot: string,
    reason: string | null,
    vehicleInterest: string | null
  ): string {
    const lines = [`Si, tengo disponibilidad para el ${date} a las ${this.formatSlotTime(slot)}.`];
    if (reason) {
      lines.push(`Motivo registrado: ${reason}.`);
    }
    if (vehicleInterest) {
      lines.push(`Vehiculo de interes: ${vehicleInterest}.`);
    }
    lines.push("Si te parece, te confirmo esa cita.");
    return lines.join("\n");
  }

  private buildAgendaAlternatives(
    preferredDate: string | null,
    preferredTime: string | null,
    suggestions: IAgendaSuggestion[],
    reason: string | null,
    vehicleInterest: string | null
  ): string {
    const lines: string[] = preferredDate && preferredTime
      ? [`No tengo ese horario exacto para el ${preferredDate} a las ${preferredTime}.`]
      : preferredDate
        ? [`No tengo cupo exacto para la fecha ${preferredDate}.`]
        : ["Estos son los horarios mas cercanos disponibles:"];

    if (suggestions.length > 0) {
      suggestions.forEach((suggestion, index) => {
        lines.push(`${index + 1}. ${suggestion.date} ${this.formatSlotTime(suggestion.slot)}`);
      });
    } else {
      lines.push("En este momento no hay espacios disponibles en agenda.");
    }

    if (reason) {
      lines.push(`Motivo registrado: ${reason}.`);
    }
    if (vehicleInterest) {
      lines.push(`Vehiculo de interes: ${vehicleInterest}.`);
    }
    lines.push("Indica cual opcion prefieres y te ayudo a confirmar.");
    return lines.join("\n");
  }

  private buildAgendaSuggestions(
    agendaDays: IAgendaDay[],
    preferredDate: string | null,
    limit: number
  ): IAgendaSuggestion[] {
    if (agendaDays.length === 0) {
      return [];
    }

    const orderedDays = [...agendaDays].sort((left, right) => left.date.localeCompare(right.date));
    const startIndex = preferredDate
      ? Math.max(0, orderedDays.findIndex((day) => day.date >= preferredDate))
      : 0;
    const rotatedDays = orderedDays.slice(startIndex).concat(orderedDays.slice(0, startIndex));

    const suggestions: IAgendaSuggestion[] = [];
    for (const day of rotatedDays) {
      for (const slot of day.slots) {
        suggestions.push({ date: day.date, slot });
        if (suggestions.length >= limit) {
          return suggestions;
        }
      }
    }

    return suggestions;
  }

  private parseAgendaDays(agendaDataset: IToolDataset): IAgendaDay[] {
    const output: IAgendaDay[] = [];
    for (const record of agendaDataset.records) {
      const matchedDate = `${record.id} ${record.title} ${record.content}`.match(/\d{4}-\d{2}-\d{2}/)?.[0];
      if (!matchedDate) {
        continue;
      }

      const slots = record.content.split(",").map((item) => item.trim()).filter(Boolean);
      if (slots.length === 0) {
        continue;
      }

      output.push({ date: matchedDate, slots });
    }

    return output.sort((left, right) => left.date.localeCompare(right.date));
  }

  private slotMatchesPreferredTime(slot: string, preferredTime: string): boolean {
    const normalizedSlot = this.normalizeTimeValue(slot);
    const normalizedPreferred = this.normalizeTimeValue(preferredTime);
    return Boolean(normalizedSlot && normalizedPreferred && normalizedSlot === normalizedPreferred);
  }

  private formatSlotTime(slot: string): string {
    const normalized = this.normalizeTimeValue(slot);
    return normalized ?? slot.match(/T(\d{2}:\d{2})/)?.[1] ?? slot;
  }

  private normalizeTimeValue(value: string): string | null {
    const normalized = value.trim().toLowerCase();
    const isoMatch = normalized.match(/t(\d{2}):(\d{2})/);
    if (isoMatch?.[1] && isoMatch[2]) {
      return `${isoMatch[1]}:${isoMatch[2]}`;
    }

    const twentyFourHourMatch = normalized.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
    if (twentyFourHourMatch?.[1] && twentyFourHourMatch[2]) {
      return `${twentyFourHourMatch[1].padStart(2, "0")}:${twentyFourHourMatch[2]}`;
    }

    const amPmMatch = normalized.match(/\b(\d{1,2})(?::([0-5]\d))?\s*(am|pm)\b/);
    if (!amPmMatch?.[1] || !amPmMatch[3]) {
      return null;
    }

    let hours = Number(amPmMatch[1]);
    const minutes = amPmMatch[2] ?? "00";
    if (amPmMatch[3] === "pm" && hours < 12) {
      hours += 12;
    } else if (amPmMatch[3] === "am" && hours === 12) {
      hours = 0;
    }

    return `${String(hours).padStart(2, "0")}:${minutes}`;
  }

  private resolvePreferredDate(
    variables: Record<string, unknown>,
    userMessage: string
  ): string | null {
    const fromVariable = this.normalizeDateValue(this.readFirstString(variables, ["fechaPreferida", "fecha"]) ?? "");
    if (fromVariable) {
      return fromVariable;
    }
    const fromMessage = this.normalizeDateValue(userMessage);
    if (fromMessage) {
      return fromMessage;
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

    const weekdayTokens: Array<{ token: string; day: number }> = [
      { token: "domingo", day: 0 },
      { token: "lunes", day: 1 },
      { token: "martes", day: 2 },
      { token: "miercoles", day: 3 },
      { token: "jueves", day: 4 },
      { token: "viernes", day: 5 },
      { token: "sabado", day: 6 }
    ];
    for (const weekday of weekdayTokens) {
      if (!normalizedMessage.includes(weekday.token)) {
        continue;
      }
      const daysOffset = (weekday.day - today.getDay() + 7) % 7 || 7;
      const date = new Date(today);
      date.setDate(today.getDate() + daysOffset);
      return this.toIsoDate(date);
    }

    return null;
  }

  private resolvePreferredTime(
    variables: Record<string, unknown>,
    userMessage: string
  ): string | null {
    const fromVariable = this.readFirstString(variables, ["horaPreferida", "hora"]);
    return this.normalizeTimeValue(fromVariable ?? "") ?? this.normalizeTimeValue(userMessage);
  }

  private resolveAppointmentReason(
    variables: Record<string, unknown>,
    userMessage: string
  ): string | null {
    const reasonFromVariable = this.readFirstString(variables, ["motivoCita"]);
    if (reasonFromVariable) {
      return reasonFromVariable;
    }

    const normalizedMessage = this.normalizeFreeText(userMessage);
    if (/\b(prueba\s+de\s+manejo|test\s+drive)\b/.test(normalizedMessage)) {
      return "prueba de manejo";
    }
    if (/\b(asesoria|asesoria|consultar|consulta|cotizacion|financiamiento)\b/.test(normalizedMessage)) {
      return "asesoria";
    }
    return null;
  }

  private resolveVehicleInterest(
    variables: Record<string, unknown>,
    userMessage: string
  ): string | null {
    const fromVariable = this.readFirstString(variables, ["vehiculoInteres", "tipoVehiculo"]);
    if (fromVariable) {
      return fromVariable;
    }
    const typeFromMessage = this.extractVehicleTypeFromText(userMessage);
    if (typeFromMessage) {
      return typeFromMessage;
    }
    return userMessage.match(
      /\b(?:me\s+interesa|interesado\s+en|quiero\s+probar|quiero\s+ver|sobre)\s+([A-Za-z0-9ÁÉÍÓÚÑáéíóúñ\s-]{3,48})/i
    )?.[1]?.trim() ?? null;
  }

  private toCatalogCandidate(record: IToolDataset["records"][number]): ICatalogCandidate {
    const combinedText = `${record.title} ${record.content}`;
    return {
      record,
      price: this.extractPriceNumber(record.content),
      mileage: this.extractMileageNumber(combinedText),
      year: this.extractYear(combinedText),
      vehicleType: this.extractVehicleTypeFromText(combinedText),
      condition: this.inferVehicleCondition(
        this.extractYear(combinedText),
        this.extractMileageNumber(combinedText)
      )
    };
  }

  private inferVehicleCondition(year: number | null, mileage: number | null): "nuevo" | "usado" {
    const currentYear = new Date().getFullYear();
    return year !== null && year >= currentYear && mileage !== null && mileage <= 5_000
      ? "nuevo"
      : "usado";
  }

  private resolveBudgetHint(
    variables: Record<string, unknown>,
    userMessage: string
  ): number | null {
    const budgetFromVariable = this.extractPriceNumber(this.readFirstString(variables, ["presupuesto"]) ?? "");
    return budgetFromVariable ?? this.extractPriceNumber(userMessage);
  }

  private resolveRequestedVehicleType(
    variables: Record<string, unknown>,
    userMessage: string
  ): string | null {
    const fromVariable = this.readFirstString(variables, ["tipoVehiculo", "vehiculoInteres"]);
    return this.extractVehicleTypeFromText(fromVariable ?? "") ?? this.extractVehicleTypeFromText(userMessage);
  }

  private resolveRequestedVehicleCondition(
    variables: Record<string, unknown>,
    userMessage: string
  ): "nuevo" | "usado" | null {
    const fromVariable = this.normalizeFreeText(this.readFirstString(variables, ["condicionVehiculo"]) ?? "");
    if (fromVariable.includes("nuevo")) {
      return "nuevo";
    }
    if (fromVariable.includes("usado") || fromVariable.includes("seminuevo")) {
      return "usado";
    }

    const fromMessage = this.normalizeFreeText(userMessage);
    if (fromMessage.includes("nuevo")) {
      return "nuevo";
    }
    if (fromMessage.includes("usado") || fromMessage.includes("seminuevo")) {
      return "usado";
    }

    return null;
  }

  private resolveEmployeeDiscount(variables: Record<string, unknown>): boolean {
    const normalized = this.normalizeFreeText(this.readFirstString(variables, ["descuentoEmpleado"]) ?? "");
    return normalized === "si" || normalized === "true" || normalized === "1";
  }

  private readFirstString(
    variables: Record<string, unknown>,
    fieldPaths: string[]
  ): string | null {
    for (const fieldPath of fieldPaths) {
      const value = RunConversationTurnHelper.readVariable(variables, fieldPath);
      if (value === undefined || value === null) {
        continue;
      }
      const text = typeof value === "string" ? value.trim() : String(value);
      if (text) {
        return text;
      }
    }
    return null;
  }

  private formatCurrency(value: number): string {
    return `Q ${value.toLocaleString("es-GT")}`;
  }

  private extractPriceNumber(value: string): number | null {
    const fromPriceLabel = value.match(/precio\s*:\s*([0-9][0-9.,]*)/i)?.[1];
    if (fromPriceLabel) {
      return this.parseNumericToken(fromPriceLabel);
    }

    const fromDesdeLabel = value.match(/desde\s*:?\s*([0-9][0-9.,]*)/i)?.[1];
    if (fromDesdeLabel) {
      return this.parseNumericToken(fromDesdeLabel);
    }

    const fromCurrency = value.match(/(?:GTQ|Q|USD|\$)\s*([0-9][0-9.,]*)/i)?.[1];
    if (fromCurrency) {
      return this.parseNumericToken(fromCurrency);
    }

    const numericTokens = Array.from(value.matchAll(/\b([0-9][0-9.,]{3,})\b/g))
      .map((match) => match[1] ?? "")
      .filter(Boolean)
      .map((token) => this.parseNumericToken(token))
      .filter((numberValue): numberValue is number => Number.isFinite(numberValue ?? NaN))
      .filter((numberValue) => numberValue >= 10_000);
    return numericTokens.length > 0 ? Math.max(...numericTokens) : null;
  }

  private parseNumericToken(value: string): number | null {
    const parsed = Number(value.replace(/[.,]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private sanitizeFaqAnswer(content: string): string {
    return content.replace(/^\[[^\]]+\]\s*/g, "").replace(/\s+/g, " ").trim();
  }

  private buildHumanReadableCatalogOption(candidate: ICatalogCandidate): string {
    const price = candidate.price !== null ? this.formatCurrency(candidate.price) : "precio no especificado";
    const city = this.extractFieldFromCatalogContent(candidate.record.content, "Ciudad");
    const fuel = this.extractFieldFromCatalogContent(candidate.record.content, "Combustible");
    const transmission =
      this.extractFieldFromCatalogContent(candidate.record.content, "Transmision") ??
      this.extractFieldFromCatalogContent(candidate.record.content, "Transmisión");
    const mileage = candidate.mileage !== null ? `${candidate.mileage.toLocaleString("es-GT")} km` : null;

    const facts = [`${candidate.vehicleType ?? "vehiculo"} ${candidate.condition}`, `precio ${price}`];
    if (city) {
      facts.push(`ubicado en ${city}`);
    }
    if (mileage) {
      facts.push(`kilometraje ${mileage}`);
    }
    if (fuel) {
      facts.push(`combustible ${fuel.toLowerCase()}`);
    }
    if (transmission) {
      facts.push(`transmision ${transmission.toLowerCase()}`);
    }

    const description = this.extractVehicleDescriptionSnippet(candidate.record.content);
    if (description) {
      facts.push(description);
    }
    return `${candidate.record.title}: ${facts.join(", ")}.`;
  }

  private extractFieldFromCatalogContent(content: string, fieldLabel: string): string | null {
    const regex = new RegExp(`${RunConversationTurnHelper.escapeRegExp(fieldLabel)}\\s*:\\s*([^.;\\n]+)`, "i");
    return content.match(regex)?.[1]?.trim() ?? null;
  }

  private extractVehicleDescriptionSnippet(content: string): string | null {
    const stripped = content
      .replace(/\b(?:Segmento|Ciudad|Precio|Kilometraje|Combustible|Transmision|Transmisión)\s*:[^.;\n]+[.;]?\s*/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    return stripped ? this.clampText(stripped, 90) : null;
  }

  private extractMileageNumber(value: string): number | null {
    const token = value.match(/kilometraje\s*:\s*(\d{1,3}(?:[.,]\d{3})+|\d{3,})/i)?.[1];
    if (!token) {
      return null;
    }
    const parsed = Number(token.replace(/[.,]/g, ""));
    return Number.isFinite(parsed) ? parsed : null;
  }

  private extractYear(value: string): number | null {
    const parsedYear = Number(value.match(/\b(20\d{2}|19\d{2})\b/)?.[1] ?? "");
    return Number.isFinite(parsedYear) ? parsedYear : null;
  }

  private extractVehicleTypeFromText(value: string): string | null {
    const normalized = this.normalizeFreeText(value);
    if (!normalized) {
      return null;
    }
    if (/\b(pickup|pick up|pick-up)\b/.test(normalized)) {
      return "pickup";
    }
    if (/\b(suv|camioneta|crossover)\b/.test(normalized)) {
      return "suv";
    }
    if (/\b(sedan)\b/.test(normalized)) {
      return "sedan";
    }
    if (/\b(hatchback)\b/.test(normalized)) {
      return "hatchback";
    }
    if (/\b(coupe)\b/.test(normalized)) {
      return "coupe";
    }
    return null;
  }

  private normalizeDateValue(value: string): string | null {
    const iso = value.match(/\b(\d{4}-\d{2}-\d{2})\b/)?.[1];
    if (iso) {
      return iso;
    }

    const slash = value.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/);
    if (!slash?.[1] || !slash[2] || !slash[3]) {
      return null;
    }
    const day = slash[1].padStart(2, "0");
    const month = slash[2].padStart(2, "0");
    return `${slash[3]}-${month}-${day}`;
  }

  private toIsoDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  private extractDirectQueryTokens(normalizedMessage: string): string[] {
    const stopWords = new Set([
      "a",
      "al",
      "con",
      "cual",
      "cuales",
      "de",
      "del",
      "el",
      "en",
      "la",
      "las",
      "los",
      "me",
      "por",
      "que",
      "quiero",
      "tiene",
      "tienen",
      "bueno",
      "buena",
      "ese",
      "esa",
      "este",
      "esta",
      "un",
      "una",
      "y",
      "mi",
      "mis",
      "hoy"
    ]);
    return normalizedMessage
      .split(/[^a-z0-9]+/)
      .map((token) => token.trim())
      .filter((token) => token.length > 1 && !stopWords.has(token));
  }

  private scoreDatasetByQueryTokens(
    dataset: IToolDataset,
    queryTokens: string[]
  ): Array<{ record: IToolDataset["records"][number]; score: number }> {
    return dataset.records
      .map((record) => {
        const searchable = this.normalizeFreeText(`${record.title} ${record.content} ${(record.tags ?? []).join(" ")}`);
        const hitCount = queryTokens.reduce(
          (totalHits, token) => (searchable.includes(token) ? totalHits + 1 : totalHits),
          0
        );
        return {
          record,
          score: queryTokens.length > 0 ? hitCount / queryTokens.length : 0
        };
      })
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score);
  }

  private findDatasetByName(
    datasets: IToolDataset[],
    candidates: string[]
  ): IToolDataset | undefined {
    return datasets.find((dataset) => {
      const normalizedName = this.normalizeFreeText(dataset.name);
      return candidates.some((candidate) => normalizedName.includes(candidate));
    });
  }

  private isFaqIntent(normalizedMessage: string): boolean {
    return /\b(horario|ubicacion|financiamiento|garantia|compra|proceso|requisito|faq|pregunta)\b/.test(
      normalizedMessage
    );
  }

  private isCatalogIntent(
    normalizedMessage: string,
    variables: Record<string, unknown>
  ): boolean {
    if (
      /\b(catalogo|vehiculo|vehiculos|auto|autos|carro|carros|sedan|suv|pickup|camioneta|comparar|recomendar|disponibles|precio|precios)\b/.test(
        normalizedMessage
      )
    ) {
      return true;
    }

    return Boolean(this.readFirstString(variables, ["presupuesto", "tipoVehiculo", "condicionVehiculo"]));
  }

  private isAgendaIntent(
    normalizedMessage: string,
    variables: Record<string, unknown>
  ): boolean {
    if (
      /\b(cita|agendar|agenda|prueba\s+de\s+manejo|asesoria|asesoría|fecha|hora|disponibilidad|disponible)\b/.test(
        normalizedMessage
      )
    ) {
      return true;
    }

    return Boolean(this.readFirstString(variables, ["fechaPreferida", "horaPreferida", "motivoCita"]));
  }

  private extractPriceHint(content: string): string | null {
    const fromLabel = content.match(/(?:precio|desde)\s*:\s*([^.\n]+)/i)?.[1];
    if (fromLabel) {
      return fromLabel.trim();
    }
    return content.match(/(?:GTQ|Q|USD|\$)\s*\d[\d.,]*/i)?.[0]?.trim() ?? null;
  }

  private clampText(value: string, maxChars: number): string {
    const normalized = value.trim();
    return normalized.length <= maxChars ? normalized : `${normalized.slice(0, maxChars - 3)}...`;
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
}
