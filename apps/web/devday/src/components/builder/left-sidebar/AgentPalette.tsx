import { NODE_PALETTE_ITEMS } from "@/lib/reactflow/rf.defaults";
import { useFlowStore } from "@/state/flow.store";

import { AgentCard } from "./AgentCard";

export function AgentPalette() {
  const addNodeFromPalette = useFlowStore((state) => state.addNodeFromPalette);

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="panel-title">Palette</p>
          <p className="panel-subtitle">Nodos disponibles</p>
        </div>
      </div>
      <div className="panel__body agent-palette">
        {NODE_PALETTE_ITEMS.map((item) => (
          <AgentCard
            key={item.type}
            item={item}
            onAdd={addNodeFromPalette}
          />
        ))}
      </div>
    </section>
  );
}
