export interface JsonToolRecord {
  id: string;
  title: string;
  content: string;
  tags?: string[];
}

export interface JsonToolDataset {
  name: string;
  description: string;
  records: JsonToolRecord[];
}

const JSON_DATASETS: JsonToolDataset[] = [
  {
    name: "faqs",
    description: "Preguntas frecuentes generales",
    records: [
      {
        id: "faq-1",
        title: "Horario",
        content: "Lunes a sabado de 8:00 a 18:00."
      },
      {
        id: "faq-2",
        title: "Financiamiento",
        content: "Se ofrece financiamiento para asalariados e independientes."
      }
    ]
  },
  {
    name: "catalog",
    description: "Catalogo resumido de vehiculos",
    records: [
      {
        id: "car-1",
        title: "Sedan LX 2026",
        content: "Desde $24,900. Colores: blanco, gris, negro."
      },
      {
        id: "car-2",
        title: "SUV XT 2026",
        content: "Desde $34,500. Incluye paquete de seguridad."
      }
    ]
  },
  {
    name: "agenda",
    description: "Slots disponibles para citas",
    records: [
      {
        id: "slot-1",
        title: "Lunes 10:00",
        content: "Asesora Ana Morales disponible."
      },
      {
        id: "slot-2",
        title: "Martes 15:00",
        content: "Asesor Carlos Perez disponible."
      }
    ]
  }
];

export async function listJsonDatasets(): Promise<JsonToolDataset[]> {
  return structuredClone(JSON_DATASETS);
}

export async function getJsonDatasetByName(name: string): Promise<JsonToolDataset | null> {
  const dataset = JSON_DATASETS.find((item) => item.name === name);
  return dataset ? structuredClone(dataset) : null;
}
