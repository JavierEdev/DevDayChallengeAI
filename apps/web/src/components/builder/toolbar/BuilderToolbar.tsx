import { useFlowStore } from "@/state/flow.store";
import { useUiStore } from "@/state/ui.store";

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

  const handleLoad = () => {
    void loadFlowById(flowId);
  };

  const handleValidate = () => {
    void validateFlow();
  };

  const handleSave = () => {
    void saveFlow();
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
        <button type="button" className="is-muted" onClick={resetFlow}>
          Reset
        </button>
        <button type="button" onClick={handleLoad} disabled={isLoading}>
          {isLoading ? "Cargando..." : "Cargar"}
        </button>
        <button type="button" onClick={handleValidate} disabled={isValidating}>
          {isValidating ? "Validando..." : "Validar"}
        </button>
        <button type="button" onClick={handleSave} disabled={isSaving}>
          {isSaving ? "Guardando..." : "Guardar"}
        </button>
        <button type="button" className="is-muted" onClick={toggleLeftSidebar}>
          Palette
        </button>
        <button type="button" className="is-muted" onClick={toggleRightSidebar}>
          Inspector
        </button>
        <button type="button" className="is-muted" onClick={toggleChat}>
          Chat
        </button>
      </div>
    </section>
  );
}
