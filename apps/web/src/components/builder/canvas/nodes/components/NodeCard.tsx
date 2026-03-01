import { Handle, Position } from "reactflow";
import type { NodeCardProps } from "./models/NodeCardProps";


export function NodeCard({ variant, selected, eyebrow, title, summary, children }: NodeCardProps) {
  return (
    <div className={`node-card node-card--${variant} ${selected ? "is-selected" : ""}`}>
      <Handle className="rf-handle rf-handle--in" type="target" position={Position.Left} id="in" />
      <Handle className="rf-handle rf-handle--out" type="source" position={Position.Right} id="out" />
      {children}
      <p className="node-card__eyebrow">{eyebrow}</p>
      <p className="node-card__title">{title}</p>
      <p className="node-card__meta">{summary}</p>
    </div>
  );
}
