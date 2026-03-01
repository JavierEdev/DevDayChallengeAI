import type { StartNodeData } from "@shared/contracts/flow/types";

interface StartFormProps {
  data: StartNodeData;
  onChange: (patch: Partial<StartNodeData>) => void;
}

export type { StartFormProps };
