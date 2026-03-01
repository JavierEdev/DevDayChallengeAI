import type {
  AgentNodeData,
  ResponseNodeData,
  RouterNodeData,
  StartNodeData,
  ToolNodeData,
  ValidatorNodeData
} from "@shared/contracts/flow/types";

import { useFlowStore } from "@/state/flow.store";

import { InspectorHeader } from "./InspectorHeader";
import { GenericForm } from "./forms/GenericForm";
import { MemoryForm } from "./forms/MemoryForm";
import { OrchestratorForm } from "./forms/OrchestratorForm";
import { SpecialistForm } from "./forms/SpecialistForm";
import { ToolForm } from "./forms/ToolForm";
import { ValidatorForm } from "./forms/ValidatorForm";

export function InspectorPanel() {
  const selectedNode = useFlowStore((state) => state.getSelectedNode());
  const updateSelectedNodeConfig = useFlowStore((state) => state.updateSelectedNodeConfig);

  const patchConfig = (patch: Record<string, unknown>) => {
    updateSelectedNodeConfig(patch);
  };

  if (!selectedNode) {
    return (
      <section className="panel inspector-panel">
        <div className="panel__header">
          <div>
            <p className="panel-title">Inspector</p>
            <p className="panel-subtitle">Sin selección</p>
          </div>
        </div>
        <div className="panel__body">
          <p className="inspector-empty">
            Selecciona un nodo en el canvas para editar sus propiedades.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel inspector-panel">
      <InspectorHeader
        nodeId={selectedNode.id}
        contractType={selectedNode.data.contractType}
      />
      <div className="panel__body">
        {selectedNode.data.contractType === "start" ? (
          <MemoryForm
            data={selectedNode.data.config as StartNodeData}
            onChange={(patch) => patchConfig(patch as Record<string, unknown>)}
          />
        ) : null}

        {selectedNode.data.contractType === "router" ? (
          <OrchestratorForm
            data={selectedNode.data.config as RouterNodeData}
            onChange={(patch) => patchConfig(patch as Record<string, unknown>)}
          />
        ) : null}

        {selectedNode.data.contractType === "validator" ? (
          <ValidatorForm
            data={selectedNode.data.config as ValidatorNodeData}
            onChange={(patch) => patchConfig(patch as Record<string, unknown>)}
          />
        ) : null}

        {selectedNode.data.contractType === "agent" ? (
          <SpecialistForm
            data={selectedNode.data.config as AgentNodeData}
            onChange={(patch) => patchConfig(patch as Record<string, unknown>)}
          />
        ) : null}

        {selectedNode.data.contractType === "response" ? (
          <GenericForm
            data={selectedNode.data.config as ResponseNodeData}
            onChange={(patch) => patchConfig(patch as Record<string, unknown>)}
          />
        ) : null}

        {selectedNode.data.contractType === "tool" ? (
          <ToolForm
            data={selectedNode.data.config as ToolNodeData}
            onChange={(patch) => patchConfig(patch as Record<string, unknown>)}
          />
        ) : null}
      </div>
    </section>
  );
}
