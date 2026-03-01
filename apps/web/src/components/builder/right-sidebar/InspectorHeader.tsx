interface InspectorHeaderProps {
  nodeId: string;
  contractType: string;
  onDeleteNode?: () => void;
}

export function InspectorHeader({ nodeId, contractType, onDeleteNode }: InspectorHeaderProps) {
  return (
    <div className="panel__header">
      <div>
        <p className="panel-title">Inspector</p>
        <p className="panel-subtitle">
          {contractType} | {nodeId}
        </p>
      </div>
      {onDeleteNode ? (
        <button
          type="button"
          className="inspector-trash-button"
          aria-label="Eliminar nodo"
          title="Eliminar nodo"
          onClick={onDeleteNode}
        >
          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
            <path
              d="M9 3h6l1 2h4v2H4V5h4l1-2zm1 7h2v8h-2v-8zm4 0h2v8h-2v-8zM7 10h2v8H7v-8z"
              fill="currentColor"
            />
          </svg>
        </button>
      ) : null}
    </div>
  );
}
