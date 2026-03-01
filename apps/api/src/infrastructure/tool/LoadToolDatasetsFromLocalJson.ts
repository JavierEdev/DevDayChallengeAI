import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { TextUtils } from "../../application/common/TextUtils.js";
import type { IToolDataset, IToolRecord } from "../../domain/tool/IToolRepository.js";

interface IFaqQuestion {
  id?: number;
  pregunta?: string;
  respuesta?: string;
}

interface IFaqCategory {
  categoria?: string;
  preguntas?: IFaqQuestion[];
}

interface IFaqFile {
  faq_agencia_autos?: IFaqCategory[];
}

interface IAutoFile {
  available_vehicles?: Array<Record<string, unknown>>;
}

interface IDatesItem {
  fecha?: string;
  slots?: string[];
}

export interface ILoadToolDatasetsFromLocalJsonOptions {
  repoRootPath: string;
  faqPath?: string;
  autosPath?: string;
  datesPath?: string;
}

export function loadToolDatasetsFromLocalJson(
  options: ILoadToolDatasetsFromLocalJsonOptions
): IToolDataset[] {
  const faqPath = resolve(options.repoRootPath, options.faqPath ?? "faq.json");
  const autosPath = resolve(options.repoRootPath, options.autosPath ?? "autos.json");
  const datesPath = resolve(options.repoRootPath, options.datesPath ?? "dates.json");

  const faqRaw = readFileSync(faqPath, "utf8");
  const autosRaw = readFileSync(autosPath, "utf8");
  const datesRaw = readFileSync(datesPath, "utf8");

  const faqFile = JSON.parse(faqRaw) as IFaqFile;
  const autoFile = JSON.parse(autosRaw) as IAutoFile;
  const datesFile = JSON.parse(datesRaw) as IDatesItem[];

  return [
    {
      name: "faqs",
      description: "Preguntas frecuentes del negocio",
      records: mapFaqRecords(faqFile)
    },
    {
      name: "catalogo",
      description: "Catalogo de vehiculos",
      records: mapCatalogRecords(autoFile)
    },
    {
      name: "agenda",
      description: "Disponibilidad de citas",
      records: mapAgendaRecords(datesFile)
    }
  ];
}

function mapFaqRecords(file: IFaqFile): IToolRecord[] {
  const records: IToolRecord[] = [];
  const categories = file.faq_agencia_autos ?? [];

  for (const category of categories) {
    const categoryLabel = (category.categoria ?? "general").trim() || "general";
    const questions = category.preguntas ?? [];
    for (const question of questions) {
      const numericId =
        typeof question.id === "number" ? String(question.id) : `${records.length + 1}`;
      const title = (question.pregunta ?? "").trim();
      const answer = (question.respuesta ?? "").trim();
      if (!title || !answer) {
        continue;
      }

      records.push({
        id: `faq-${numericId}`,
        title,
        content: `[${categoryLabel}] ${answer}`,
        tags: [normalizeTag(categoryLabel)]
      });
    }
  }

  return records;
}

function mapCatalogRecords(file: IAutoFile): IToolRecord[] {
  const vehicles = file.available_vehicles ?? [];
  const records: IToolRecord[] = [];

  for (let index = 0; index < vehicles.length; index += 1) {
    const vehicle = vehicles[index];
    if (!vehicle) {
      continue;
    }
    const brand = toText(vehicle["Marca"]);
    const model = toText(vehicle["Modelo"]);
    const year = toText(vehicle["Año"]);
    const segment = toText(vehicle["Segmento"]);
    const city = toText(vehicle["Ciudad"]);
    const price = toText(vehicle["Precio"]);
    const mileage = toText(vehicle["Kilometraje"]);
    const fuelType = toText(vehicle["Tipo de combustible"]);
    const transmission = toText(vehicle["Transmisión"]);
    const description = toText(vehicle["Descripción"]);

    const title = [brand, model, year].filter(Boolean).join(" ").trim();
    if (!title) {
      continue;
    }

    const summaryParts = [
      segment ? `Segmento: ${segment}.` : "",
      city ? `Ciudad: ${city}.` : "",
      price ? `Precio: ${price}.` : "",
      mileage ? `Kilometraje: ${mileage}.` : "",
      fuelType ? `Combustible: ${fuelType}.` : "",
      transmission ? `Transmision: ${transmission}.` : "",
      description
    ].filter(Boolean);

    records.push({
      id: `catalogo-${index + 1}`,
      title,
      content: summaryParts.join(" "),
      tags: [normalizeTag(segment || "vehiculo"), normalizeTag(city || "general")]
    });
  }

  return records;
}

function mapAgendaRecords(items: IDatesItem[]): IToolRecord[] {
  const records: IToolRecord[] = [];

  for (const day of items) {
    const date = (day.fecha ?? "").trim();
    if (!date) {
      continue;
    }

    const slots = Array.isArray(day.slots) ? day.slots.filter(Boolean) : [];
    records.push({
      id: `agenda-${date}`,
      title: `Disponibilidad ${date}`,
      content: slots.length > 0 ? slots.join(", ") : "Sin espacios disponibles",
      tags: ["citas", date]
    });
  }

  return records;
}

function toText(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return "";
}

function normalizeTag(value: string): string {
  return TextUtils.shared.normalizeIdentifier(value);
}
