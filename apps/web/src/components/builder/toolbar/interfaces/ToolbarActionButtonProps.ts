import type { ReactNode } from "react";

interface ToolbarActionButtonProps {
  label: string;
  icon: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export type { ToolbarActionButtonProps };
