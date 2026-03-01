import type { NodeProps } from "reactflow";

import type { ResponseNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

export function GenericNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as ResponseNodeData;
  const title = config.title?.trim() || "Generic";
  const summary = config.endSession ? "Cierra sesión" : "Mantiene sesión abierta";

  return (
    <div className={`node-card node-card--generic ${selected ? "is-selected" : ""}`}>
      <p className="node-card__eyebrow">response</p>
      <p className="node-card__title">{title}</p>
      <p className="node-card__meta">{summary}</p>
    </div>
  );
}
