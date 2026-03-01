import type { PropsWithChildren } from "react";
import { ReactFlowProvider } from "reactflow";
import "reactflow/dist/style.css";

export function AppProviders({ children }: PropsWithChildren) {
  return <ReactFlowProvider>{children}</ReactFlowProvider>;
}
