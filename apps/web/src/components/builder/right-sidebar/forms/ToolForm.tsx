import { useEffect, useState } from "react";

import type { ToolNodeData } from "@shared/contracts/flow/types";

import { listJsonDatasets } from "@/services/json-tools.api";

interface ToolFormProps {
  data: ToolNodeData;
  onChange: (patch: Partial<ToolNodeData>) => void;
}

interface ToolPreset {
  key: string;
  label: string;
  toolName: string;
  instructions: string;
  outputVariable: string;
}

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

function optionalText(value: string): string | undefined {
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

function optionalInt(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function ToolForm({ data, onChange }: ToolFormProps) {
  const [datasetNames, setDatasetNames] = useState<string[]>([]);

  useEffect(() => {
    void listJsonDatasets()
      .then((datasets) => {
        setDatasetNames(datasets.map((dataset) => dataset.name));
      })
      .catch(() => {
        setDatasetNames([]);
      });
  }, []);

  const applyPreset = (preset: ToolPreset) => {
    onChange({
      title: preset.label,
      toolName: preset.toolName,
      availableCollections: [preset.toolName],
      instructions: preset.instructions,
      outputVariable: preset.outputVariable,
      inputTemplate: "{{last_user_message}}"
    });
  };

  return (
    <div className="inspector-form">
      <div className="inspector-field">
        <label className="inspector-label">Presets por Caso</label>
        <div className="confirm-dialog__actions">
          {TOOL_PRESETS.map((preset) => (
            <button
              key={preset.key}
              type="button"
              className="inspector-button is-muted"
              onClick={() => applyPreset(preset)}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="tool-title">
          Titulo
        </label>
        <input
          id="tool-title"
          className="inspector-input"
          value={data.title ?? ""}
          onChange={(event) => onChange({ title: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="tool-name">
          Tool Name
        </label>
        <input
          id="tool-name"
          list="tool-dataset-names"
          className="inspector-input"
          value={data.toolName}
          onChange={(event) => onChange({ toolName: event.target.value })}
        />
        <datalist id="tool-dataset-names">
          {datasetNames.map((datasetName) => (
            <option key={datasetName} value={datasetName} />
          ))}
        </datalist>
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="tool-instructions">
          Instrucciones
        </label>
        <textarea
          id="tool-instructions"
          className="inspector-textarea"
          value={data.instructions ?? ""}
          onChange={(event) => onChange({ instructions: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="tool-input-template">
          Input Template
        </label>
        <textarea
          id="tool-input-template"
          className="inspector-textarea"
          value={data.inputTemplate ?? ""}
          onChange={(event) => onChange({ inputTemplate: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="tool-output-variable">
          Output Variable
        </label>
        <input
          id="tool-output-variable"
          className="inspector-input"
          value={data.outputVariable ?? ""}
          onChange={(event) => onChange({ outputVariable: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="tool-timeout">
          Timeout (ms)
        </label>
        <input
          id="tool-timeout"
          className="inspector-input"
          type="number"
          min="1"
          step="100"
          value={data.timeoutMs ?? ""}
          onChange={(event) => onChange({ timeoutMs: optionalInt(event.target.value) })}
        />
      </div>
    </div>
  );
}
