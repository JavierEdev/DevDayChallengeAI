import type { ToolPreset } from "../interfaces/ToolPreset";

const TOOL_PRESETS: ToolPreset[] = [
  {
    key: "faq",
    label: "Consultas Generales",
    toolName: "faqs",
    instructions: "Busca informacion de horarios, ubicacion, financiamiento y garantias.",
    outputVariable: "tool_context_faq"
  },
  {
    key: "catalogo",
    label: "Catalogo Vehiculos",
    toolName: "catalogo",
    instructions: "Busca vehiculos segun presupuesto, tipo y disponibilidad.",
    outputVariable: "tool_context_catalogo"
  },
  {
    key: "agenda",
    label: "Agendamiento Cita",
    toolName: "agenda",
    instructions: "Busca disponibilidad de fechas y horarios para citas.",
    outputVariable: "tool_context_agenda"
  }
];

export { TOOL_PRESETS };
