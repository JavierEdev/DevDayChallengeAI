import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";

import type { MemoryNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

export function MemoryNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as MemoryNodeData;
  const title = config.title?.trim() || "Memory";
  const summary = config.instructions?.trim() || "Nodo de memoria del flujo.";

  return (
    <div className={`node-card node-card--memory ${selected ? "is-selected" : ""}`}>
      <Handle className="rf-handle rf-handle--in" type="target" position={Position.Left} id="in" />
      <Handle className="rf-handle rf-handle--out" type="source" position={Position.Right} id="out" />
      <p className="node-card__eyebrow">memory/{config.mode}</p>
      <p className="node-card__title">{title}</p>
      <p className="node-card__meta">{summary}</p>
    </div>
  );
}
