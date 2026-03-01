import type { ValidatorNodeData } from "@shared/contracts/flow/types";

interface ValidatorFormProps {
  data: ValidatorNodeData;
  onChange: (patch: Partial<ValidatorNodeData>) => void;
}

export type { ValidatorFormProps };
