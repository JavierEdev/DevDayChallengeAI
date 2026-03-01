import type { ReactNode } from "react";

interface ToolbarActionButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function ToolbarActionButton({
  label,
  icon,
  onClick,
  disabled = false,
  className
}: Readonly<ToolbarActionButtonProps>) {
  return (
    <button type="button" className={className} onClick={onClick} disabled={disabled}>
      <span className="toolbar-action__content">
        <span className="toolbar-action__icon" aria-hidden="true">
          {icon}
        </span>
        <span>{label}</span>
      </span>
    </button>
  );
}
