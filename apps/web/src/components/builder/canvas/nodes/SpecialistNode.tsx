import type { NodeProps } from "reactflow";

import type { AgentNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

import { NodeCard } from "./components/NodeCard";

export function SpecialistNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as AgentNodeData;
  const title = config.title?.trim() || "Specialist";
  const summary = config.model?.trim() || "Modelo por defecto";

  return (
    <NodeCard variant="specialist" selected={selected} eyebrow="agent" title={title} summary={summary} />
  );
}
