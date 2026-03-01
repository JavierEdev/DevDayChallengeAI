import type { NodeProps } from "reactflow";

import type { StartNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

import { NodeCard } from "./components/NodeCard";

export function StartNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as StartNodeData;
  const title = config.title?.trim() || "Start";
  const summary = config.welcomeMessage?.trim() || "Nodo inicial del flujo.";

  return (
    <NodeCard variant="start" selected={selected} eyebrow="start" title={title} summary={summary} />
  );
}
