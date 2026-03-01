import type { BuilderNodeType, NodePaletteItem } from "@/lib/reactflow/rf.types";

interface AgentCardProps {
  item: NodePaletteItem;
  onAdd: (nodeType: BuilderNodeType) => void;
}

export function AgentCard({ item, onAdd }: AgentCardProps) {
  return (
    <button
      type="button"
      className="agent-card"
      onClick={() => onAdd(item.type)}
    >
      <span className="agent-card__title">{item.title}</span>
      <span className="agent-card__subtitle">{item.subtitle}</span>
    </button>
  );
}
