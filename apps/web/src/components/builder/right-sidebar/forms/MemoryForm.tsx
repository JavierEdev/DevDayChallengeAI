import type { MemoryNodeData } from "@shared/contracts/flow/types";
import type { MemoryFormProps } from "../interfaces/MemoryFormProps";

function optionalText(value: string): string | undefined {
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

export function MemoryForm({ data, onChange }: Readonly<MemoryFormProps>) {
  return (
    <div className="inspector-form">
      <div className="inspector-field">
        <label className="inspector-label" htmlFor="memory-title">
          Titulo
        </label>
        <input
          id="memory-title"
          className="inspector-input"
          value={data.title ?? ""}
          onChange={(event) => onChange({ title: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="memory-description">
          Descripcion
        </label>
        <input
          id="memory-description"
          className="inspector-input"
          value={data.description ?? ""}
          onChange={(event) => onChange({ description: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="memory-mode">
          Mode
        </label>
        <select
          id="memory-mode"
          className="inspector-select"
          value={data.mode}
          onChange={(event) => onChange({ mode: event.target.value as MemoryNodeData["mode"] })}
        >
          <option value="read">read</option>
          <option value="write">write</option>
        </select>
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="memory-instructions">
          Instructions
        </label>
        <textarea
          id="memory-instructions"
          className="inspector-textarea"
          value={data.instructions ?? ""}
          onChange={(event) => onChange({ instructions: optionalText(event.target.value) })}
        />
      </div>
    </div>
  );
}
