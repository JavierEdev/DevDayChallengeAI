interface InspectorHeaderProps {
  nodeId: string;
  contractType: string;
}

export function InspectorHeader({ nodeId, contractType }: InspectorHeaderProps) {
  return (
    <div className="panel__header">
      <div>
        <p className="panel-title">Inspector</p>
        <p className="panel-subtitle">
          {contractType} • {nodeId}
        </p>
      </div>
    </div>
  );
}
