import { useEffect, useMemo, useState } from "react";

import type { RouterNodeData, RouterRoute } from "@shared/contracts/flow/types";

interface OrchestratorFormProps {
  data: RouterNodeData;
  onChange: (patch: Partial<RouterNodeData>) => void;
}

function optionalText(value: string): string | undefined {
  const next = value.trim();
  return next.length > 0 ? next : undefined;
}

function stringifyRoutes(routes: RouterRoute[]): string {
  return JSON.stringify(routes, null, 2);
}

export function OrchestratorForm({ data, onChange }: OrchestratorFormProps) {
  const initialDraft = useMemo(() => stringifyRoutes(data.routes), [data.routes]);
  const [routesDraft, setRoutesDraft] = useState(initialDraft);
  const [routesError, setRoutesError] = useState<string | null>(null);

  useEffect(() => {
    setRoutesDraft(initialDraft);
  }, [initialDraft]);

  const handleRoutesBlur = () => {
    try {
      const parsed = JSON.parse(routesDraft) as RouterRoute[];
      onChange({ routes: parsed });
      setRoutesError(null);
    } catch {
      setRoutesError("JSON invalido para routes.");
    }
  };

  return (
    <div className="inspector-form">
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
        <label className="inspector-label" htmlFor="orchestrator-routes">
          Routes (JSON)
        </label>
        <textarea
          id="orchestrator-routes"
          className="inspector-textarea"
          value={routesDraft}
          onChange={(event) => setRoutesDraft(event.target.value)}
          onBlur={handleRoutesBlur}
        />
        <p className="inspector-help">
          Formato: array de objetos con `id`, `label`, `targetNodeId` y opcional `matchValue`.
        </p>
        {routesError ? <p className="inspector-error">{routesError}</p> : null}
      </div>
    </div>
  );
}
