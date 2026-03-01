import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";

import { createSupabaseClientFromEnv } from "../src/infrastructure/supabase/CreateSupabaseClient.js";

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

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirectoryPath = dirname(currentFilePath);
const repoRootPath = resolve(currentDirectoryPath, "../../..");
const apiRootPath = resolve(currentDirectoryPath, "..");
dotenv.config({ path: resolve(apiRootPath, ".env") });

async function run(): Promise<void> {
  const supabase = createSupabaseClientFromEnv(process.env);
  const faqPath = process.env.FAQ_JSON_PATH
    ? resolve(repoRootPath, process.env.FAQ_JSON_PATH)
    : resolve(repoRootPath, "faq.json");
  const autosPath = process.env.AUTOS_JSON_PATH
    ? resolve(repoRootPath, process.env.AUTOS_JSON_PATH)
    : resolve(repoRootPath, "autos.json");
  const datesPath = process.env.DATES_JSON_PATH
    ? resolve(repoRootPath, process.env.DATES_JSON_PATH)
    : resolve(repoRootPath, "dates.json");

  const faqRaw = await readFile(faqPath, "utf8");
  const autosRaw = await readFile(autosPath, "utf8");
  const datesRaw = await readFile(datesPath, "utf8");

  const faqFile = JSON.parse(faqRaw) as IFaqFile;
  const autoFile = JSON.parse(autosRaw) as IAutoFile;
  const datesFile = JSON.parse(datesRaw) as IDatesItem[];

  const datasets = [
    { name: "faqs", description: "Preguntas frecuentes del negocio" },
    { name: "catalogo", description: "Catalogo de vehiculos" },
    { name: "agenda", description: "Disponibilidad de citas" }
  ];

  const faqRecords = mapFaqRecords(faqFile);
  const catalogRecords = mapCatalogRecords(autoFile);
  const agendaRecords = mapAgendaRecords(datesFile);
  const allRecords = [...faqRecords, ...catalogRecords, ...agendaRecords];

  const { error: upsertDatasetsError } = await supabase.from("tool_datasets").upsert(
    datasets.map((dataset) => ({
      name: dataset.name,
      description: dataset.description,
      updated_at: new Date().toISOString()
    })),
    { onConflict: "name" }
  );
  if (upsertDatasetsError) {
    throw new Error(`Failed to upsert datasets: ${upsertDatasetsError.message}`);
  }

  const { error: clearRecordsError } = await supabase
    .from("tool_records")
    .delete()
    .in("dataset_name", ["faqs", "catalogo", "agenda"]);
  if (clearRecordsError) {
    throw new Error(`Failed to clear old tool records: ${clearRecordsError.message}`);
  }

  for (const chunk of chunkArray(allRecords, 500)) {
    const { error: insertRecordsError } = await supabase.from("tool_records").insert(chunk);
    if (insertRecordsError) {
      throw new Error(`Failed to insert tool records: ${insertRecordsError.message}`);
    }
  }

  console.log(
    `Seed completed. faqs=${faqRecords.length}, catalogo=${catalogRecords.length}, agenda=${agendaRecords.length}`
  );
}

function mapFaqRecords(file: IFaqFile): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];
  const categories = file.faq_agencia_autos ?? [];

  for (const category of categories) {
    const categoryLabel = (category.categoria ?? "general").trim() || "general";
    for (const question of category.preguntas ?? []) {
      const numericId = typeof question.id === "number" ? String(question.id) : randomSuffix();
      const title = (question.pregunta ?? "").trim();
      const answer = (question.respuesta ?? "").trim();
      if (!title || !answer) {
        continue;
      }

      records.push({
        id: `faq-${numericId}`,
        dataset_name: "faqs",
        title,
        content: `[${categoryLabel}] ${answer}`,
        tags: [normalizeTag(categoryLabel)]
      });
    }
  }

  return records;
}

function mapCatalogRecords(file: IAutoFile): Array<Record<string, unknown>> {
  const vehicles = file.available_vehicles ?? [];
  const records: Array<Record<string, unknown>> = [];

  for (let index = 0; index < vehicles.length; index += 1) {
    const vehicle = vehicles[index];
    const brand = toText(vehicle["Marca"]);
    const model = toText(vehicle["Modelo"]);
    const year = toText(vehicle["Año"]);
    const segment = toText(vehicle["Segmento"]);
    const city = toText(vehicle["Ciudad"]);
    const price = toText(vehicle["Precio"]);
    const description = toText(vehicle["Descripción"]);

    const title = [brand, model, year].filter(Boolean).join(" ").trim();
    if (!title) {
      continue;
    }

    const summaryParts = [
      segment ? `Segmento: ${segment}.` : "",
      city ? `Ciudad: ${city}.` : "",
      price ? `Precio: ${price}.` : "",
      description
    ].filter(Boolean);

    records.push({
      id: `catalogo-${index + 1}`,
      dataset_name: "catalogo",
      title,
      content: summaryParts.join(" "),
      tags: [normalizeTag(segment || "vehiculo"), normalizeTag(city || "general")]
    });
  }

  return records;
}

function mapAgendaRecords(items: IDatesItem[]): Array<Record<string, unknown>> {
  const records: Array<Record<string, unknown>> = [];

  for (const day of items) {
    const date = (day.fecha ?? "").trim();
    if (!date) {
      continue;
    }

    const slots = Array.isArray(day.slots) ? day.slots.filter(Boolean) : [];
    records.push({
      id: `agenda-${date}`,
      dataset_name: "agenda",
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
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function chunkArray<T>(items: T[], chunkSize: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += chunkSize) {
    chunks.push(items.slice(index, index + chunkSize));
  }
  return chunks;
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 10);
}

run().catch((error) => {
  console.error("Failed to seed Supabase tool data", error);
  process.exitCode = 1;
});

