import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";

import type { ValidatorNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

export function ValidatorNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as ValidatorNodeData;
  const title = config.title?.trim() || "Validator";
  const summary = `${config.mode ?? "all"} | ${config.rules?.length ?? 0} reglas`;

  return (
    <div className={`node-card node-card--validator ${selected ? "is-selected" : ""}`}>
      <Handle className="rf-handle rf-handle--in" type="target" position={Position.Left} id="in" />
      <Handle className="rf-handle rf-handle--out" type="source" position={Position.Right} id="out" />
      <p className="node-card__eyebrow">validator</p>
      <p className="node-card__title">{title}</p>
      <p className="node-card__meta">{summary}</p>
    </div>
  );
}
