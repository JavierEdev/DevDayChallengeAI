import { Handle, Position } from "reactflow";
import type { NodeProps } from "reactflow";

import type { AgentNodeData, ResponseNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

export function GenericNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const isResponseNode = data.contractType === "response";
  const config = isResponseNode
    ? (data.config as ResponseNodeData)
    : (data.config as AgentNodeData);
  const title = config.title?.trim() || "Generic";
  const summary = isResponseNode
    ? (config as ResponseNodeData).endSession
      ? "Cierra sesion"
      : "Mantiene sesion abierta"
    : (config as AgentNodeData).instructions?.trim() || "Agente generico conversacional.";

  return (
    <div className={`node-card node-card--generic ${selected ? "is-selected" : ""}`}>
      <Handle className="rf-handle rf-handle--in" type="target" position={Position.Left} id="in" />
      <Handle className="rf-handle rf-handle--out" type="source" position={Position.Right} id="out" />
      <p className="node-card__eyebrow">{isResponseNode ? "response" : "agent/generic"}</p>
      <p className="node-card__title">{title}</p>
      <p className="node-card__meta">{summary}</p>
    </div>
  );
}
