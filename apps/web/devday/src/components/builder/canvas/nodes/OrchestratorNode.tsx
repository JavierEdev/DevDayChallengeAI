import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";

import type { RouterNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

export function OrchestratorNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as RouterNodeData;
  const title = config.title?.trim() || "Orchestrator";
  const summary = `${config.strategy} | ${config.routes.length} rutas`;

  return (
    <div className={`node-card node-card--orchestrator ${selected ? "is-selected" : ""}`}>
      <Handle className="rf-handle rf-handle--in" type="target" position={Position.Left} id="in" />
      <Handle className="rf-handle rf-handle--out" type="source" position={Position.Right} id="out" />
      <Handle
        className="rf-handle rf-handle--out-alt"
        type="source"
        position={Position.Right}
        id="fallback"
        style={{ top: "72%" }}
      />
      <p className="node-card__eyebrow">router</p>
      <p className="node-card__title">{title}</p>
      <p className="node-card__meta">{summary}</p>
    </div>
  );
}
