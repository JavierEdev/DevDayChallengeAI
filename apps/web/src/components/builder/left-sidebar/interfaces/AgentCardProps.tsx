import type { BuilderNodeType, NodePaletteItem } from "@/lib/reactflow/rf.types";

interface AgentCardProps {
  item: NodePaletteItem;
  onAdd: (nodeType: BuilderNodeType) => void;
}

export type { AgentCardProps };