import {
  FolderOpen,
  RotateCcw,
  Save,
  ShieldCheck
} from "lucide-react";
import { ChevronDown, MessageSquare, PanelLeft, PanelRight } from "lucide-react";
import { useRef } from "react";

import { useFlowStore } from "@/state/flow.store";
import { useUiStore } from "@/state/ui.store";

import { ToolbarActionButton } from "./ToolbarActionButton";

export function BuilderToolbar() {
  const flowId = useFlowStore((state) => state.flowId);
  const flowName = useFlowStore((state) => state.flowName);
  const nodesCount = useFlowStore((state) => state.nodes.length);
  const edgesCount = useFlowStore((state) => state.edges.length);
  const validation = useFlowStore((state) => state.validation);
  const isValidating = useFlowStore((state) => state.isValidating);
  const isSaving = useFlowStore((state) => state.isSaving);
  const isLoading = useFlowStore((state) => state.isLoading);
  const lastError = useFlowStore((state) => state.lastError);
  const setFlowMeta = useFlowStore((state) => state.setFlowMeta);
  const resetFlow = useFlowStore((state) => state.resetFlow);
  const loadFlowById = useFlowStore((state) => state.loadFlowById);
  const validateFlow = useFlowStore((state) => state.validateFlow);
  const saveFlow = useFlowStore((state) => state.saveFlow);

  const toggleLeftSidebar = useUiStore((state) => state.toggleLeftSidebar);
  const toggleRightSidebar = useUiStore((state) => state.toggleRightSidebar);
  const toggleChat = useUiStore((state) => state.toggleChat);
  const visualizationDropdownRef = useRef<HTMLDetailsElement>(null);

  const handleLoad = () => {
    void loadFlowById(flowId);
  };

  const handleValidate = () => {
    void validateFlow();
  };

  const handleSave = () => {
    void saveFlow();
  };

  const handleVisualizationAction = (action: () => void) => {
    action();
    if (visualizationDropdownRef.current) {
      visualizationDropdownRef.current.open = false;
    }
  };

  return (
    <section className="toolbar">
      <div className="toolbar__group">
        <div className="toolbar__field">
          <label htmlFor="toolbar-flow-id">Flow ID</label>
          <input
            id="toolbar-flow-id"
            value={flowId}
            onChange={(event) => setFlowMeta({ id: event.target.value })}
          />
        </div>
        <div className="toolbar__field">
          <label htmlFor="toolbar-flow-name">Nombre</label>
          <input
            id="toolbar-flow-name"
            value={flowName}
            onChange={(event) => setFlowMeta({ name: event.target.value })}
          />
        </div>
      </div>

      <div className="toolbar__group">
        <span className="status-pill">
          {nodesCount} nodos • {edgesCount} edges
        </span>
        {validation ? (
          <span className={`status-pill ${validation.valid ? "" : "is-error"}`}>
            {validation.valid
              ? "valido"
              : `${validation.errors.length} error(es), ${validation.warnings.length} warning(s)`}
          </span>
        ) : null}
        {lastError ? <span className="status-pill is-error">{lastError}</span> : null}
      </div>

      <div className="toolbar__group">
        <ToolbarActionButton
          label="Reset"
          icon={<RotateCcw size={14} />}
          onClick={resetFlow}
          className="is-muted"
        />
        <ToolbarActionButton
          label={isLoading ? "Cargando..." : "Cargar"}
          icon={<FolderOpen size={14} />}
          onClick={handleLoad}
          disabled={isLoading}
        />
        <ToolbarActionButton
          label={isValidating ? "Validando..." : "Validar"}
          icon={<ShieldCheck size={14} />}
          onClick={handleValidate}
          disabled={isValidating}
        />
        <ToolbarActionButton
          label={isSaving ? "Guardando..." : "Guardar"}
          icon={<Save size={14} />}
          onClick={handleSave}
          disabled={isSaving}
        />
        <details className="toolbar-dropdown" ref={visualizationDropdownRef}>
          <summary className="toolbar-dropdown__trigger">
            <span className="toolbar-action__content">
              <span>Visualizacion</span>
              <ChevronDown size={14} aria-hidden="true" />
            </span>
          </summary>
          <div className="toolbar-dropdown__menu">
            <ToolbarActionButton
              label="Palette"
              icon={<PanelLeft size={14} />}
              onClick={() => handleVisualizationAction(toggleLeftSidebar)}
              className="is-muted toolbar-dropdown__item"
            />
            <ToolbarActionButton
              label="Inspector"
              icon={<PanelRight size={14} />}
              onClick={() => handleVisualizationAction(toggleRightSidebar)}
              className="is-muted toolbar-dropdown__item"
            />
            <ToolbarActionButton
              label="Chat"
              icon={<MessageSquare size={14} />}
              onClick={() => handleVisualizationAction(toggleChat)}
              className="is-muted toolbar-dropdown__item"
            />
          </div>
        </details>
      </div>
    </section>
  );
}
