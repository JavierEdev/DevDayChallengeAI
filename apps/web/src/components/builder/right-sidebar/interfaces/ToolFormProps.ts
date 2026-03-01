import type { ToolNodeData } from "@shared/contracts/flow/types";

interface ToolFormProps {
  data: ToolNodeData;
  onChange: (patch: Partial<ToolNodeData>) => void;
}

export type { ToolFormProps };
