import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";

import type { ToolNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

export function ToolNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as ToolNodeData;
  const title = config.title?.trim() || "Tool";
  const summary = config.toolName?.trim() || "Sin dataset";

  return (
    <div className={`node-card node-card--tool ${selected ? "is-selected" : ""}`}>
      <Handle className="rf-handle rf-handle--in" type="target" position={Position.Left} id="in" />
      <Handle className="rf-handle rf-handle--out" type="source" position={Position.Right} id="out" />
      <p className="node-card__eyebrow">tool</p>
      <p className="node-card__title">{title}</p>
      <p className="node-card__meta">{summary}</p>
    </div>
  );
}
