import { useCallback, useMemo } from "react";
import type { DragEvent } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import type { Connection } from "reactflow";
import { useReactFlow } from "reactflow";

import {
  BUILDER_NODE_DND_MIME,
  isBuilderNodeType,
  type BuilderNodeData
} from "@/lib/reactflow/rf.types";
import { useFlowStore } from "@/state/flow.store";

import { GenericNode } from "./nodes/GenericNode";
import { MemoryNode } from "./nodes/MemoryNode";
import { OrchestratorNode } from "./nodes/OrchestratorNode";
import { SpecialistNode } from "./nodes/SpecialistNode";
import { StartNode } from "./nodes/StartNode";
import { ToolNode } from "./nodes/ToolNode";
import { ValidatorNode } from "./nodes/ValidatorNode";

const nodeTypes = {
  start: StartNode,
  memory: MemoryNode,
  orchestrator: OrchestratorNode,
  validator: ValidatorNode,
  specialist: SpecialistNode,
  generic: GenericNode,
  tool: ToolNode
};

export function FlowCanvas() {
  const { screenToFlowPosition } = useReactFlow();
  const nodes = useFlowStore((state) => state.nodes);
  const edges = useFlowStore((state) => state.edges);
  const onNodesChange = useFlowStore((state) => state.onNodesChange);
  const onEdgesChange = useFlowStore((state) => state.onEdgesChange);
  const onConnect = useFlowStore((state) => state.onConnect);
  const addNodeFromPalette = useFlowStore((state) => state.addNodeFromPalette);
  const selectNode = useFlowStore((state) => state.selectNode);

  const typedNodeTypes = useMemo(() => nodeTypes, []);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: { id: string; data: BuilderNodeData }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  const handlePaneClick = useCallback(() => {
    selectNode(null);
  }, [selectNode]);

  const isValidConnection = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) {
        return false;
      }

      if (connection.source === connection.target) {
        return false;
      }

      const duplicated = edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          (edge.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
          (edge.targetHandle ?? null) === (connection.targetHandle ?? null)
      );

      return !duplicated;
    },
    [edges]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      const rawType =
        event.dataTransfer.getData(BUILDER_NODE_DND_MIME) ||
        event.dataTransfer.getData("text/plain");
      if (!rawType || !isBuilderNodeType(rawType)) {
        return;
      }

      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY
      });
      addNodeFromPalette(rawType, {
        x: position.x,
        y: position.y
      });
    },
    [addNodeFromPalette, screenToFlowPosition]
  );

  return (
    <div className="flow-canvas">
      <ReactFlow
        fitView
        nodes={nodes}
        edges={edges}
        nodeTypes={typedNodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        isValidConnection={isValidConnection}
        nodesConnectable
        nodesDraggable
        elementsSelectable
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <Background gap={24} size={1.2} />
        <MiniMap pannable zoomable />
        <Controls />
      </ReactFlow>
    </div>
  );
}
