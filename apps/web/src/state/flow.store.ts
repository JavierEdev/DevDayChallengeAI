import { addEdge, applyEdgeChanges, applyNodeChanges } from "reactflow";
import type { Connection, EdgeChange, NodeChange } from "reactflow";
import { create } from "zustand";

import type { ValidateFlowResponse } from "@shared/contracts/api/types";
import type { FlowDefinition } from "@shared/contracts/flow/types";

import {
  DEFAULT_FLOW_DESCRIPTION,
  DEFAULT_FLOW_ID,
  DEFAULT_FLOW_NAME,
  STARTER_FLOW_DEFINITION
} from "@/lib/reactflow/rf.defaults";
import {
  createBuilderNode,
  createId,
  fromFlowDefinition,
  toFlowDefinition
} from "@/lib/reactflow/rf.helpers";
import type { BuilderFlowEdge, BuilderFlowNode, BuilderNodeType } from "@/lib/reactflow/rf.types";
import { getFlow, upsertFlow, validateFlow } from "@/services/flow-executor.api";

interface FlowMetaPatch {
  id?: string;
  name?: string;
  description?: string;
}

interface FlowStoreState {
  flowId: string;
  flowName: string;
  flowDescription: string;
  version: number;
  nodes: BuilderFlowNode[];
  edges: BuilderFlowEdge[];
  selectedNodeId: string | null;
  validation: ValidateFlowResponse | null;
  isValidating: boolean;
  isSaving: boolean;
  isLoading: boolean;
  lastError: string | null;
  setFlowMeta: (patch: FlowMetaPatch) => void;
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  setNodes: (nodes: BuilderFlowNode[]) => void;
  setEdges: (edges: BuilderFlowEdge[]) => void;
  addNodeFromPalette: (
    nodeType: BuilderNodeType,
    options?: {
      x: number;
      y: number;
    }
  ) => void;
  deleteSelectedNode: () => void;
  selectNode: (nodeId: string | null) => void;
  getSelectedNode: () => BuilderFlowNode | null;
  updateSelectedNodeConfig: (patch: Record<string, unknown>) => void;
  replaceSelectedNodeConfig: (config: BuilderFlowNode["data"]["config"]) => void;
  resetFlow: () => void;
  buildFlowDefinition: () => FlowDefinition;
  loadFlowDefinition: (flow: FlowDefinition) => void;
  loadFlowById: (flowId: string) => Promise<FlowDefinition | null>;
  validateFlow: () => Promise<ValidateFlowResponse | null>;
  saveFlow: () => Promise<FlowDefinition | null>;
}

function normalizeError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unexpected error.";
}

const starter = fromFlowDefinition(STARTER_FLOW_DEFINITION);

export const useFlowStore = create<FlowStoreState>((set, get) => ({
  flowId: DEFAULT_FLOW_ID,
  flowName: DEFAULT_FLOW_NAME,
  flowDescription: DEFAULT_FLOW_DESCRIPTION,
  version: 1,
  nodes: starter.nodes,
  edges: starter.edges,
  selectedNodeId: null,
  validation: null,
  isValidating: false,
  isSaving: false,
  isLoading: false,
  lastError: null,

  setFlowMeta: (patch) =>
    set((state) => ({
      flowId: patch.id ? patch.id.trim() : state.flowId,
      flowName: patch.name ? patch.name.trim() : state.flowName,
      flowDescription: patch.description ?? state.flowDescription
    })),

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),

  onNodesChange: (changes) =>
    set((state) => ({
      nodes: applyNodeChanges(changes, state.nodes) as BuilderFlowNode[]
    })),

  onEdgesChange: (changes) =>
    set((state) => ({
      edges: applyEdgeChanges(changes, state.edges) as BuilderFlowEdge[]
    })),

  onConnect: (connection) =>
    set((state) => {
      if (!connection.source || !connection.target) {
        return state;
      }

      if (connection.source === connection.target) {
        return state;
      }

      const duplicated = state.edges.some(
        (edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          (edge.sourceHandle ?? null) === (connection.sourceHandle ?? null) &&
          (edge.targetHandle ?? null) === (connection.targetHandle ?? null)
      );
      if (duplicated) {
        return state;
      }

      return {
        edges: addEdge(
          {
            id: createId("edge"),
            source: connection.source,
            target: connection.target,
            sourceHandle: connection.sourceHandle ?? undefined,
            targetHandle: connection.targetHandle ?? undefined
          },
          state.edges
        ) as BuilderFlowEdge[]
      };
    }),

  addNodeFromPalette: (nodeType, options) =>
    set((state) => {
      const offset = state.nodes.length;
      const node = createBuilderNode(nodeType, {
        x: options?.x ?? 90 + (offset % 3) * 220,
        y: options?.y ?? 70 + Math.floor(offset / 3) * 170
      });
      return {
        nodes: [...state.nodes, node],
        selectedNodeId: node.id
      };
    }),

  deleteSelectedNode: () =>
    set((state) => {
      if (!state.selectedNodeId) {
        return state;
      }

      const nodeIdToDelete = state.selectedNodeId;
      return {
        nodes: state.nodes.filter((node) => node.id !== nodeIdToDelete),
        edges: state.edges.filter(
          (edge) => edge.source !== nodeIdToDelete && edge.target !== nodeIdToDelete
        ),
        selectedNodeId: null
      };
    }),

  selectNode: (nodeId) => set({ selectedNodeId: nodeId }),

  getSelectedNode: () => {
    const state = get();
    if (!state.selectedNodeId) {
      return null;
    }

    return state.nodes.find((node) => node.id === state.selectedNodeId) ?? null;
  },

  updateSelectedNodeConfig: (patch) =>
    set((state) => {
      if (!state.selectedNodeId) {
        return state;
      }

      return {
        nodes: state.nodes.map((node) =>
          node.id === state.selectedNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  config: {
                    ...(node.data.config as Record<string, unknown>),
                    ...patch
                  }
                }
              }
            : node
        )
      };
    }),

  replaceSelectedNodeConfig: (config) =>
    set((state) => {
      if (!state.selectedNodeId) {
        return state;
      }

      return {
        nodes: state.nodes.map((node) =>
          node.id === state.selectedNodeId
            ? {
                ...node,
                data: {
                  ...node.data,
                  config
                }
              }
            : node
        )
      };
    }),

  resetFlow: () => {
    const resetState = fromFlowDefinition(STARTER_FLOW_DEFINITION);
    set({
      flowId: DEFAULT_FLOW_ID,
      flowName: DEFAULT_FLOW_NAME,
      flowDescription: DEFAULT_FLOW_DESCRIPTION,
      version: 1,
      nodes: resetState.nodes,
      edges: resetState.edges,
      selectedNodeId: null,
      validation: null,
      isValidating: false,
      isSaving: false,
      isLoading: false,
      lastError: null
    });
  },

  buildFlowDefinition: () => {
    const state = get();
    return toFlowDefinition({
      id: state.flowId,
      name: state.flowName,
      description: state.flowDescription,
      version: state.version,
      nodes: state.nodes,
      edges: state.edges
    });
  },

  loadFlowDefinition: (flow) => {
    const parsed = fromFlowDefinition(flow);
    set({
      flowId: flow.id,
      flowName: flow.name,
      flowDescription: flow.description ?? "",
      version: flow.version,
      nodes: parsed.nodes,
      edges: parsed.edges,
      selectedNodeId: null,
      validation: null,
      lastError: null
    });
  },

  loadFlowById: async (flowId) => {
    if (!flowId.trim()) {
      set({ lastError: "Flow ID requerido para cargar." });
      return null;
    }

    set({ isLoading: true, lastError: null });
    try {
      const flow = await getFlow(flowId);
      get().loadFlowDefinition(flow);
      return flow;
    } catch (error) {
      set({ lastError: normalizeError(error) });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  validateFlow: async () => {
    set({ isValidating: true, lastError: null });
    try {
      const response = await validateFlow(get().buildFlowDefinition());
      set({ validation: response });
      return response;
    } catch (error) {
      set({ lastError: normalizeError(error), validation: null });
      return null;
    } finally {
      set({ isValidating: false });
    }
  },

  saveFlow: async () => {
    set({ isSaving: true, lastError: null });
    try {
      const saved = await upsertFlow(get().buildFlowDefinition());
      const parsed = fromFlowDefinition(saved);
      set({
        flowId: saved.id,
        flowName: saved.name,
        flowDescription: saved.description ?? "",
        version: saved.version,
        nodes: parsed.nodes,
        edges: parsed.edges
      });
      return saved;
    } catch (error) {
      set({ lastError: normalizeError(error) });
      return null;
    } finally {
      set({ isSaving: false });
    }
  }
}));
