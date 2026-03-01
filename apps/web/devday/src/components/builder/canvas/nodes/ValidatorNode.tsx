import type { NodeProps } from "reactflow";

import type { ValidatorNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

export function ValidatorNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as ValidatorNodeData;
  const title = config.title?.trim() || "Validator";
  const summary = `${config.mode ?? "all"} • ${config.rules.length} reglas`;

  return (
    <div className={`node-card node-card--validator ${selected ? "is-selected" : ""}`}>
      <p className="node-card__eyebrow">validator</p>
      <p className="node-card__title">{title}</p>
      <p className="node-card__meta">{summary}</p>
    </div>
  );
}
