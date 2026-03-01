import type { StartNodeData } from "@shared/contracts/flow/types";

interface MemoryFormProps {
  data: StartNodeData;
  onChange: (patch: Partial<StartNodeData>) => void;
}

function optionalText(value: string): string | undefined {
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

export function MemoryForm({ data, onChange }: MemoryFormProps) {
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
        <label className="inspector-label" htmlFor="memory-welcome">
          Welcome Message
        </label>
        <textarea
          id="memory-welcome"
          className="inspector-textarea"
          value={data.welcomeMessage ?? ""}
          onChange={(event) => onChange({ welcomeMessage: optionalText(event.target.value) })}
        />
      </div>
    </div>
  );
}
