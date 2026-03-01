import type { StartNodeData } from "@shared/contracts/flow/types";

interface StartFormProps {
  data: StartNodeData;
  onChange: (patch: Partial<StartNodeData>) => void;
}

function optionalText(value: string): string | undefined {
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

export function StartForm({ data, onChange }: StartFormProps) {
  return (
    <div className="inspector-form">
      <div className="inspector-field">
        <label className="inspector-label" htmlFor="start-title">
          Titulo
        </label>
        <input
          id="start-title"
          className="inspector-input"
          value={data.title ?? ""}
          onChange={(event) => onChange({ title: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="start-description">
          Descripcion
        </label>
        <input
          id="start-description"
          className="inspector-input"
          value={data.description ?? ""}
          onChange={(event) => onChange({ description: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="start-welcome">
          Welcome Message
        </label>
        <textarea
          id="start-welcome"
          className="inspector-textarea"
          value={data.welcomeMessage ?? ""}
          onChange={(event) => onChange({ welcomeMessage: optionalText(event.target.value) })}
        />
      </div>
    </div>
  );
}
