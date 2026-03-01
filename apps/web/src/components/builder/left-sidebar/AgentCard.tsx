import type { DragEvent } from "react";

import type { BuilderNodeType, NodePaletteItem } from "@/lib/reactflow/rf.types";
import { BUILDER_NODE_DND_MIME } from "@/lib/reactflow/rf.types";

interface AgentCardProps {
  item: NodePaletteItem;
  onAdd: (nodeType: BuilderNodeType) => void;
}

export function AgentCard({ item, onAdd }: AgentCardProps) {
  const handleDragStart = (event: DragEvent<HTMLButtonElement>) => {
    event.dataTransfer.setData(BUILDER_NODE_DND_MIME, item.type);
    event.dataTransfer.setData("text/plain", item.type);
    event.dataTransfer.effectAllowed = "copyMove";
  };

  return (
    <button
      type="button"
      className="agent-card"
      draggable
      onClick={() => onAdd(item.type)}
      onDragStart={handleDragStart}
    >
      <span className="agent-card__title">{item.title}</span>
      <span className="agent-card__subtitle">{item.subtitle}</span>
    </button>
  );
}
