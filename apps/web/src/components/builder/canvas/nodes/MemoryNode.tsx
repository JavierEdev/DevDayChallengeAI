import type { NodeProps } from "reactflow";

import type { MemoryNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

import { NodeCard } from "./components/NodeCard";

export function MemoryNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as MemoryNodeData;
  const title = config.title?.trim() || "Memory";
  const summary = config.instructions?.trim() || "Nodo de memoria del flujo.";

  return (
    <NodeCard
      variant="memory"
      selected={selected}
      eyebrow={`memory/${config.mode}`}
      title={title}
      summary={summary}
    />
  );
}
