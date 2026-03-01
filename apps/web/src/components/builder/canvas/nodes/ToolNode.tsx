import type { NodeProps } from "reactflow";

import type { ToolNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

import { NodeCard } from "./components/NodeCard";

export function ToolNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as ToolNodeData;
  const title = config.title?.trim() || "Tool";
  const summary = config.toolName?.trim() || "Sin dataset";

  return (
    <NodeCard variant="tool" selected={selected} eyebrow="tool" title={title} summary={summary} />
  );
}
