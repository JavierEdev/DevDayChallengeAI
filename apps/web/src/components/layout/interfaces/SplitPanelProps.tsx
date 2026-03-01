import type { ReactNode } from "react";

interface SplitPaneProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  leftWidth?: number;
  rightWidth?: number;
}

export type { SplitPaneProps };
