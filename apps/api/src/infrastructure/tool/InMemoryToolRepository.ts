import { TextUtils } from "../../application/common/TextUtils.js";
import type {
  IToolDataset,
  IToolRecord,
  IToolRepository,
  IToolSemanticMatch,
  IToolSemanticSearchInput
} from "../../domain/tool/IToolRepository.js";

const DEFAULT_DATASETS: IToolDataset[] = [
  {
    name: "faqs",
    description: "Preguntas frecuentes generales de la concesionaria",
    records: [
      {
        id: "faq-1",
        title: "Horario de atencion",
        content: "Lunes a sabado de 8:00 a 18:00."
      },
      {
        id: "faq-2",
        title: "Financiamiento",
        content: "Hay opciones de financiamiento para clientes asalariados e independientes."
      },
      {
        id: "faq-3",
        title: "Garantia",
        content: "Los vehiculos nuevos incluyen garantia estandar del fabricante."
      }
    ]
  },
  {
    name: "catalogo",
    description: "Resumen del catalogo de vehiculos",
    records: [
      {
        id: "car-1",
        title: "Sedan LX 2026",
        content: "Desde $24,900. Disponible en blanco, gris y negro."
      },
      {
        id: "car-2",
        title: "SUV XT 2026",
        content: "Desde $34,500. SUV familiar con paquete de seguridad."
      },
      {
        id: "car-3",
        title: "Pickup Pro 2025",
        content: "Desde $39,200. Ideal para uso mixto en ciudad y trabajo."
      }
    ]
  },
  {
    name: "agenda",
    description: "Disponibilidad de citas con asesores",
    records: [
      {
        id: "slot-1",
        title: "Lunes 10:00",
        content: "Asesora Ana Morales disponible para pruebas de manejo."
      },
      {
        id: "slot-2",
        title: "Martes 15:00",
        content: "Asesor Carlos Perez disponible para consulta de financiamiento."
      },
      {
        id: "slot-3",
        title: "Miercoles 11:30",
        content: "Asesora Daniela Ruiz disponible para asesoria general de ventas."
      }
    ]
  }
];

const STOP_WORDS = new Set<string>([
  "a",
  "al",
  "algo",
  "con",
  "cual",
  "cuales",
  "cuales",
  "cuanto",
  "de",
  "del",
  "el",
  "en",
  "es",
  "esta",
  "este",
  "hay",
  "la",
  "las",
  "lo",
  "los",
  "me",
  "mi",
  "para",
  "por",
  "que",
  "quiero",
  "se",
  "si",
  "sin",
  "tienen",
  "tengo",
  "un",
  "una",
  "uno",
  "y"
]);

const TOKEN_EQUIVALENTS: Record<string, string[]> = {
  auto: ["carro", "vehiculo"],
  carro: ["auto", "vehiculo"],
  vehiculo: ["auto", "carro"],
  sedán: ["sedan"],
  sedanes: ["sedan"],
  usado: ["seminuevo"],
  usada: ["seminuevo"],
  seminuevo: ["usado"],
  seminuevos: ["usado"],
  camioneta: ["suv"],
  suv: ["camioneta"]
};

interface IIndexedRecord {
  datasetName: string;
  record: IToolRecord;
  searchable: string;
  titleSearchable: string;
  tokenSet: Set<string>;
}

export class InMemoryToolRepository implements IToolRepository {
  private readonly datasets: IToolDataset[];
  private readonly datasetByName = new Map<string, IToolDataset>();
  private readonly indexedByDataset = new Map<string, IIndexedRecord[]>();

  constructor(initialDatasets: IToolDataset[] = DEFAULT_DATASETS) {
    this.datasets = structuredClone(initialDatasets);
    for (const dataset of this.datasets) {
      this.datasetByName.set(dataset.name, dataset);
      this.indexedByDataset.set(
        dataset.name,
        dataset.records.map((record) => this.indexRecord(dataset.name, record))
      );
    }
  }

  async listDatasets(): Promise<IToolDataset[]> {
    return structuredClone(this.datasets);
  }

  async getDatasetByName(name: string): Promise<IToolDataset | null> {
    const dataset = this.datasetByName.get(name);
    return dataset ? structuredClone(dataset) : null;
  }

  async searchSimilarRecords(input: IToolSemanticSearchInput): Promise<IToolSemanticMatch[]> {
    const normalizedQuery = normalizeText(input.query);
    if (!normalizedQuery) {
      return [];
    }

    const tokens = expandTokens(
      tokenize(normalizedQuery).filter((token) => token.length > 1 && !STOP_WORDS.has(token))
    );
    if (tokens.length === 0) {
      return [];
    }

    const limit = Math.max(1, input.limit ?? 5);
    const scopedDatasetNames = input.datasetName
      ? [input.datasetName]
      : this.datasets.map((dataset) => dataset.name);

    const matches: IToolSemanticMatch[] = [];
    for (const datasetName of scopedDatasetNames) {
      const indexedRecords = this.indexedByDataset.get(datasetName) ?? [];
      for (const indexedRecord of indexedRecords) {
        const score = this.scoreRecord(indexedRecord, normalizedQuery, tokens);
        if (score <= 0) {
          continue;
        }

        matches.push({
          ...indexedRecord.record,
          datasetName,
          similarity: Math.min(1, score)
        });
      }
    }

    matches.sort((left, right) => right.similarity - left.similarity);
    return structuredClone(matches.slice(0, limit));
  }

  private indexRecord(datasetName: string, record: IToolRecord): IIndexedRecord {
    const titleSearchable = normalizeText(record.title);
    const searchable = normalizeText(
      `${record.title} ${record.content} ${(record.tags ?? []).join(" ")}`
    );

    return {
      datasetName,
      record,
      searchable,
      titleSearchable,
      tokenSet: new Set(tokenize(searchable))
    };
  }

  private scoreRecord(
    record: IIndexedRecord,
    normalizedQuery: string,
    tokens: string[]
  ): number {
    let hitCount = 0;
    let titleHitCount = 0;

    for (const token of tokens) {
      if (record.tokenSet.has(token) || record.searchable.includes(token)) {
        hitCount += 1;
        if (record.titleSearchable.includes(token)) {
          titleHitCount += 1;
        }
      }
    }

    if (hitCount === 0) {
      return 0;
    }

    let score = hitCount / tokens.length;
    if (record.searchable.includes(normalizedQuery)) {
      score += 0.25;
    }

    if (titleHitCount > 0) {
      score += Math.min(0.2, titleHitCount * 0.08);
    }

    return score;
  }
}

function expandTokens(tokens: string[]): string[] {
  const expanded = new Set<string>();

  for (const token of tokens) {
    expanded.add(token);
    const equivalents = TOKEN_EQUIVALENTS[token];
    for (const equivalent of equivalents ?? []) {
      expanded.add(normalizeText(equivalent));
    }
  }

  return Array.from(expanded);
}

function tokenize(value: string): string[] {
  return value
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);
}

function normalizeText(value: string): string {
  return TextUtils.shared.normalizeFreeText(value);
}
