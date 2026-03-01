import type { OrchestratorPreset } from "../interfaces/OrchestratorPreset";

const ORCHESTRATOR_PRESETS: OrchestratorPreset[] = [
  {
    key: "faq",
    label: "Consultas Generales",
    instructions:
      "Detecta preguntas de horarios, ubicacion, financiamiento y garantias. Enruta a la salida etiquetada como faqs o consultas."
  },
  {
    key: "catalogo",
    label: "Catalogo Vehiculos",
    instructions:
      "Detecta intencion de buscar, comparar o recomendar autos por presupuesto, tipo y disponibilidad. Enruta a la salida etiquetada como catalogo."
  },
  {
    key: "agenda",
    label: "Agendamiento Cita",
    instructions:
      "Detecta intencion de agendar cita, prueba de manejo o asesoria por fecha y hora. Enruta a la salida etiquetada como agenda."
  }
];

export { ORCHESTRATOR_PRESETS };
