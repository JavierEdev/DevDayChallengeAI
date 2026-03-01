import { NODE_PALETTE_ITEMS } from "@/lib/reactflow/rf.defaults";
import { useFlowStore } from "@/state/flow.store";

import { AgentCard } from "./AgentCard";
import { AGENT_PALETTE_TEXT } from "./data/agentPaletteText";

export function AgentPalette() {
  const addNodeFromPalette = useFlowStore((state) => state.addNodeFromPalette);

  return (
    <section className="panel">
      <div className="panel__header">
        <div>
          <p className="panel-title">{AGENT_PALETTE_TEXT.title}</p>
          <p className="panel-subtitle">{AGENT_PALETTE_TEXT.subtitle}</p>
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
