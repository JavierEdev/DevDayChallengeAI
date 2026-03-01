import { useEffect, useState } from "react";

import type { ValidatorNodeData } from "@shared/contracts/flow/types";

interface ValidatorFormProps {
  data: ValidatorNodeData;
  onChange: (patch: Partial<ValidatorNodeData>) => void;
}

interface ValidatorPreset {
  key: string;
  label: string;
  fields: string[];
  instructions: string;
}

const VALIDATOR_PRESETS: ValidatorPreset[] = [
  {
    key: "faq",
    label: "Consultas Generales",
    fields: ["tipoCliente", "situacionLaboral", "edadAproximada"],
    instructions:
      "Recopila perfil base del cliente antes de responder preguntas generales del negocio."
  },
  {
    key: "catalogo",
    label: "Catalogo Vehiculos",
    fields: ["presupuesto", "condicionVehiculo", "descuentoEmpleado", "tipoVehiculo"],
    instructions:
      "Valida datos del cliente para recomendar vehiculos segun perfil y presupuesto."
  },
  {
    key: "agenda",
    label: "Agendamiento Cita",
    fields: ["nombreCompleto", "fechaPreferida", "horaPreferida", "motivoCita", "vehiculoInteres"],
    instructions:
      "Solicita datos completos para confirmar cita de prueba de manejo o asesoria."
  }
];

function optionalText(value: string): string | undefined {
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

function stringifyRequiredFields(requiredFields: string[] | undefined): string {
  return (requiredFields ?? []).join("\n");
}

function parseRequiredFields(rawValue: string): string[] {
  return rawValue
    .split(/\r?\n|,/)
    .map((value) => value.trim())
    .filter(Boolean);
}

export function ValidatorForm({ data, onChange }: ValidatorFormProps) {
  const [requiredFieldsDraft, setRequiredFieldsDraft] = useState(
    stringifyRequiredFields(data.requiredFields)
  );

  useEffect(() => {
    setRequiredFieldsDraft(stringifyRequiredFields(data.requiredFields));
  }, [data.requiredFields]);

  const applyPreset = (preset: ValidatorPreset) => {
    const nextRequiredFields = preset.fields;
    setRequiredFieldsDraft(stringifyRequiredFields(nextRequiredFields));
    onChange({
      requiredFields: nextRequiredFields,
      rules: undefined,
      instructions: preset.instructions
    });
  };

  return (
    <div className="inspector-form">
      <div className="inspector-field">
        <label className="inspector-label">Presets por Caso</label>
        <div className="confirm-dialog__actions">
          {VALIDATOR_PRESETS.map((preset) => (
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
        <label className="inspector-label" htmlFor="validator-title">
          Titulo
        </label>
        <input
          id="validator-title"
          className="inspector-input"
          value={data.title ?? ""}
          onChange={(event) => onChange({ title: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="validator-mode">
          Mode
        </label>
        <select
          id="validator-mode"
          className="inspector-select"
          value={data.mode ?? "all"}
          onChange={(event) => onChange({ mode: event.target.value as ValidatorNodeData["mode"] })}
        >
          <option value="all">all</option>
          <option value="any">any</option>
        </select>
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="validator-instructions">
          Instrucciones
        </label>
        <textarea
          id="validator-instructions"
          className="inspector-textarea"
          value={data.instructions ?? ""}
          onChange={(event) => onChange({ instructions: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="validator-fail">
          On Fail Node Id
        </label>
        <input
          id="validator-fail"
          className="inspector-input"
          value={data.onFailNodeId ?? ""}
          onChange={(event) => onChange({ onFailNodeId: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="validator-required-fields">
          Campos requeridos
        </label>
        <textarea
          id="validator-required-fields"
          className="inspector-textarea"
          value={requiredFieldsDraft}
          onChange={(event) => setRequiredFieldsDraft(event.target.value)}
          onBlur={() =>
            onChange({
              requiredFields: parseRequiredFields(requiredFieldsDraft),
              rules: undefined
            })
          }
        />
        <p className="inspector-help">Uno por linea. Ejemplo: nombre, presupuesto, tipoVehiculo.</p>
      </div>
    </div>
  );
}
