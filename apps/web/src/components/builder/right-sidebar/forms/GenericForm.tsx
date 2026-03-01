import type { GenericFormProps } from "../interfaces/GenericFormProps";

function optionalText(value: string): string | undefined {
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

export function GenericForm({ data, onChange }: Readonly<GenericFormProps>) {
  return (
    <div className="inspector-form">
      <div className="inspector-field">
        <label className="inspector-label" htmlFor="generic-title">
          Titulo
        </label>
        <input
          id="generic-title"
          className="inspector-input"
          value={data.title ?? ""}
          onChange={(event) => onChange({ title: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="generic-template">
          Message Template
        </label>
        <textarea
          id="generic-template"
          className="inspector-textarea"
          value={data.messageTemplate}
          onChange={(event) => onChange({ messageTemplate: event.target.value })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="generic-description">
          Descripcion
        </label>
        <input
          id="generic-description"
          className="inspector-input"
          value={data.description ?? ""}
          onChange={(event) => onChange({ description: optionalText(event.target.value) })}
        />
      </div>

      <div className="inspector-field">
        <label className="inspector-label" htmlFor="generic-end-session">
          End Session
        </label>
        <input
          id="generic-end-session"
          type="checkbox"
          checked={Boolean(data.endSession)}
          onChange={(event) => onChange({ endSession: event.target.checked })}
        />
      </div>
    </div>
  );
}
