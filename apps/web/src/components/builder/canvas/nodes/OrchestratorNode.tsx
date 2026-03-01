import { Handle, Position, useStore } from "reactflow";
import type { NodeProps } from "reactflow";

import type { RouterNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

import { NodeCard } from "./components/NodeCard";

export function OrchestratorNode({ id, data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as RouterNodeData;
  const title = config.title?.trim() || "Orchestrator";
  const connectedRoutes = useStore(
    (state) => state.edges.filter((edge) => edge.source === id).length
  );
  const configuredRoutes = Array.isArray(config.routes) ? config.routes.length : 0;
  const routeCount = Math.max(configuredRoutes, connectedRoutes);
  const summary = `${config.strategy ?? "intent"} | ${routeCount} rutas`;

  return (
    <NodeCard
      variant="orchestrator"
      selected={selected}
      eyebrow="router"
      title={title}
      summary={summary}
    >
      <Handle
        className="rf-handle rf-handle--out-alt"
        type="source"
        position={Position.Right}
        id="fallback"
        style={{ top: "72%" }}
      />
    </NodeCard>
  );
}
