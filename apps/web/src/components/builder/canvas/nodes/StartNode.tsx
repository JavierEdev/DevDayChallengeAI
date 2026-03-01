import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";

import type { StartNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

export function StartNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as StartNodeData;
  const title = config.title?.trim() || "Start";
  const summary = config.welcomeMessage?.trim() || "Nodo inicial del flujo.";

  return (
    <div className={`node-card node-card--start ${selected ? "is-selected" : ""}`}>
      <Handle className="rf-handle rf-handle--in" type="target" position={Position.Left} id="in" />
      <Handle className="rf-handle rf-handle--out" type="source" position={Position.Right} id="out" />
      <p className="node-card__eyebrow">start</p>
      <p className="node-card__title">{title}</p>
      <p className="node-card__meta">{summary}</p>
    </div>
  );
}
