import type { RouterNodeData } from "@shared/contracts/flow/types";

interface OrchestratorFormProps {
  data: RouterNodeData;
  onChange: (patch: Partial<RouterNodeData>) => void;
}

export type { OrchestratorFormProps };
