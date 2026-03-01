import type { AgentNodeData } from "@shared/contracts/flow/types";

interface SpecialistFormProps {
  data: AgentNodeData;
  onChange: (patch: Partial<AgentNodeData>) => void;
}

function optionalText(value: string): string | undefined {
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function SpecialistForm({ data, onChange }: SpecialistFormProps) {
  return (
    <div className="inspector-form">
      <div className="inspector-field">
        <label className="inspector-label" htmlFor="specialist-title">
          Titulo
        </label>
        <input
          id="specialist-title"
          className="inspector-input"
          value={data.title ?? ""}
          onChange={(event) => onChange({ title: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="specialist-model">
          Model
        </label>
        <input
          id="specialist-model"
          className="inspector-input"
          value={data.model ?? ""}
          onChange={(event) => onChange({ model: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="specialist-temperature">
          Temperature
        </label>
        <input
          id="specialist-temperature"
          className="inspector-input"
          type="number"
          step="0.1"
          min="0"
          max="2"
          value={data.temperature ?? ""}
          onChange={(event) => onChange({ temperature: parseOptionalNumber(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="specialist-instructions">
          Instructions
        </label>
        <textarea
          id="specialist-instructions"
          className="inspector-textarea"
          value={data.instructions}
          onChange={(event) => onChange({ instructions: event.target.value })}
        />
      </div>
    </div>
  );
}
