import { RotateCcw, Save, ShieldCheck } from "lucide-react";
import { ChevronDown, MessageSquare, PanelLeft, PanelRight } from "lucide-react";
import { useRef, useState } from "react";

import { useFlowStore } from "@/state/flow.store";
import { useUiStore } from "@/state/ui.store";

import { TOOLBAR_TEXT } from "./data/toolbarText";
import { ToolbarActionButton } from "./ToolbarActionButton";

export function BuilderToolbar() {
  const flowId = useFlowStore((state) => state.flowId);
  const flowName = useFlowStore((state) => state.flowName);
  const nodesCount = useFlowStore((state) => state.nodes.length);
  const edgesCount = useFlowStore((state) => state.edges.length);
  const validation = useFlowStore((state) => state.validation);
  const isValidating = useFlowStore((state) => state.isValidating);
  const isSaving = useFlowStore((state) => state.isSaving);
  const lastError = useFlowStore((state) => state.lastError);
  const setFlowMeta = useFlowStore((state) => state.setFlowMeta);
  const resetFlow = useFlowStore((state) => state.resetFlow);
  const validateFlow = useFlowStore((state) => state.validateFlow);
  const saveFlow = useFlowStore((state) => state.saveFlow);

  const toggleLeftSidebar = useUiStore((state) => state.toggleLeftSidebar);
  const toggleRightSidebar = useUiStore((state) => state.toggleRightSidebar);
  const toggleChat = useUiStore((state) => state.toggleChat);
  const visualizationDropdownRef = useRef<HTMLDetailsElement>(null);
  const [isValidatePending, setValidatePending] = useState(false);
  const [isSavePending, setSavePending] = useState(false);

  const handleValidate = async () => {
    setValidatePending(true);
    try {
      await validateFlow();
    } finally {
      setValidatePending(false);
    }
  };

  const handleSave = async () => {
    setSavePending(true);
    try {
      await saveFlow();
    } finally {
      setSavePending(false);
    }
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
          <label htmlFor="toolbar-flow-id">{TOOLBAR_TEXT.flowIdLabel}</label>
          <input
            id="toolbar-flow-id"
            value={flowId}
            onChange={(event) => setFlowMeta({ id: event.target.value })}
          />
        </div>
        <div className="toolbar__field">
          <label htmlFor="toolbar-flow-name">{TOOLBAR_TEXT.flowNameLabel}</label>
          <input
            id="toolbar-flow-name"
            value={flowName}
            onChange={(event) => setFlowMeta({ name: event.target.value })}
          />
        </div>
      </div>

      <div className="toolbar__group">
        <span className="status-pill">
          {nodesCount} {TOOLBAR_TEXT.nodesLabel} - {edgesCount} {TOOLBAR_TEXT.edgesLabel}
        </span>
        {validation ? (
          <span className={`status-pill ${validation.valid ? "" : "is-error"}`}>
            {validation.valid
              ? TOOLBAR_TEXT.valid
              : `${validation.errors.length} error(es), ${validation.warnings.length} warning(s)`}
          </span>
        ) : null}
        {lastError ? <span className="status-pill is-error">{lastError}</span> : null}
      </div>

      <div className="toolbar__group">
        <ToolbarActionButton
          label={TOOLBAR_TEXT.reset}
          icon={<RotateCcw size={14} />}
          onClick={resetFlow}
          className="is-muted"
        />
        <ToolbarActionButton
          label={isValidatePending || isValidating ? TOOLBAR_TEXT.validating : TOOLBAR_TEXT.validate}
          icon={<ShieldCheck size={14} />}
          onClick={() => void handleValidate()}
          disabled={isValidatePending || isValidating}
        />
        <ToolbarActionButton
          label={isSavePending || isSaving ? TOOLBAR_TEXT.saving : TOOLBAR_TEXT.save}
          icon={<Save size={14} />}
          onClick={() => void handleSave()}
          disabled={isSavePending || isSaving}
        />
        <details className="toolbar-dropdown" ref={visualizationDropdownRef}>
          <summary className="toolbar-dropdown__trigger">
            <span className="toolbar-action__content">
              <span>{TOOLBAR_TEXT.visualization}</span>
              <ChevronDown size={14} aria-hidden="true" />
            </span>
          </summary>
          <div className="toolbar-dropdown__menu">
            <ToolbarActionButton
              label={TOOLBAR_TEXT.palette}
              icon={<PanelLeft size={14} />}
              onClick={() => handleVisualizationAction(toggleLeftSidebar)}
              className="is-muted toolbar-dropdown__item"
            />
            <ToolbarActionButton
              label={TOOLBAR_TEXT.inspector}
              icon={<PanelRight size={14} />}
              onClick={() => handleVisualizationAction(toggleRightSidebar)}
              className="is-muted toolbar-dropdown__item"
            />
            <ToolbarActionButton
              label={TOOLBAR_TEXT.chat}
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
