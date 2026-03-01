import type { RouterNodeData } from "@shared/contracts/flow/types";
import { ORCHESTRATOR_PRESETS } from "../data/OrchestratorPresetsData";
import type { OrchestratorFormProps } from "../interfaces/OrchestratorFormProps";
import type { OrchestratorPreset } from "../interfaces/OrchestratorPreset";


function optionalText(value: string): string | undefined {
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

export function OrchestratorForm({ data, onChange }: Readonly<OrchestratorFormProps>) {
  const applyPreset = (preset: OrchestratorPreset) => {
    onChange({
      strategy: "intent",
      instructions: preset.instructions
    });
  };

  return (
    <div className="inspector-form">
      <div className="inspector-field">
        <label className="inspector-label">Presets por Caso</label>
        <div className="confirm-dialog__actions">
          {ORCHESTRATOR_PRESETS.map((preset) => (
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
        <label className="inspector-label" htmlFor="orchestrator-title">
          Titulo
        </label>
        <input
          id="orchestrator-title"
          className="inspector-input"
          value={data.title ?? ""}
          onChange={(event) => onChange({ title: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="orchestrator-strategy">
          Strategy
        </label>
        <select
          id="orchestrator-strategy"
          className="inspector-select"
          value={data.strategy}
          onChange={(event) => onChange({ strategy: event.target.value as RouterNodeData["strategy"] })}
        >
          <option value="intent">intent</option>
          <option value="rule">rule</option>
        </select>
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="orchestrator-instructions">
          Instrucciones
        </label>
        <textarea
          id="orchestrator-instructions"
          className="inspector-textarea"
          value={data.instructions ?? ""}
          onChange={(event) => onChange({ instructions: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="orchestrator-fallback">
          Fallback Node Id
        </label>
        <input
          id="orchestrator-fallback"
          className="inspector-input"
          value={data.fallbackNodeId ?? ""}
          onChange={(event) => onChange({ fallbackNodeId: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <p className="inspector-help">
          Las rutas se infieren automaticamente con las conexiones salientes del router.
          Si pones label al edge, se usa como palabra clave para el ruteo por intent.
        </p>
      </div>
    </div>
  );
}
