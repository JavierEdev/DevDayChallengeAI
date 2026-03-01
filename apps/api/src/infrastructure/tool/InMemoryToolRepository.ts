import type { IToolDataset, IToolRepository } from "../../domain/tool/IToolRepository.js";

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
    name: "catalog",
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

export class InMemoryToolRepository implements IToolRepository {
  private readonly datasets: IToolDataset[];

  constructor(initialDatasets: IToolDataset[] = DEFAULT_DATASETS) {
    this.datasets = structuredClone(initialDatasets);
  }

  async listDatasets(): Promise<IToolDataset[]> {
    return structuredClone(this.datasets);
  }

  async getDatasetByName(name: string): Promise<IToolDataset | null> {
    const dataset = this.datasets.find((item) => item.name === name);
    return dataset ? structuredClone(dataset) : null;
  }
}
