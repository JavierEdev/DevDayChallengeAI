import { useEffect, useMemo, useState } from "react";

import type { ValidationRule, ValidatorNodeData } from "@shared/contracts/flow/types";

interface ValidatorFormProps {
  data: ValidatorNodeData;
  onChange: (patch: Partial<ValidatorNodeData>) => void;
}

function optionalText(value: string): string | undefined {
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

function stringifyRules(rules: ValidationRule[]): string {
  return JSON.stringify(rules, null, 2);
}

export function ValidatorForm({ data, onChange }: ValidatorFormProps) {
  const initialDraft = useMemo(() => stringifyRules(data.rules ?? []), [data.rules]);
  const [rulesDraft, setRulesDraft] = useState(initialDraft);
  const [rulesError, setRulesError] = useState<string | null>(null);

  useEffect(() => {
    setRulesDraft(initialDraft);
  }, [initialDraft]);

  const handleRulesBlur = () => {
    try {
      const parsed = JSON.parse(rulesDraft) as ValidationRule[];
      onChange({ rules: parsed });
      setRulesError(null);
    } catch {
      setRulesError("JSON invalido para rules.");
    }
  };

  return (
    <div className="inspector-form">
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
        <label className="inspector-label" htmlFor="validator-rules">
          Rules (JSON)
        </label>
        <textarea
          id="validator-rules"
          className="inspector-textarea"
          value={rulesDraft}
          onChange={(event) => setRulesDraft(event.target.value)}
          onBlur={handleRulesBlur}
        />
        <p className="inspector-help">Formato: array de reglas con field/operator/value.</p>
        {rulesError ? <p className="inspector-error">{rulesError}</p> : null}
      </div>
    </div>
  );
}
