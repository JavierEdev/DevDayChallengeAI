import type { ResponseNodeData } from "@shared/contracts/flow/types";

interface GenericFormProps {
  data: ResponseNodeData;
  onChange: (patch: Partial<ResponseNodeData>) => void;
}

export type { GenericFormProps };
