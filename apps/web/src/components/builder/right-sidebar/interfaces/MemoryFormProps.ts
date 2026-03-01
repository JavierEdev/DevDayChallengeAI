import type { MemoryNodeData } from "@shared/contracts/flow/types";

interface MemoryFormProps {
  data: MemoryNodeData;
  onChange: (patch: Partial<MemoryNodeData>) => void;
}

export type { MemoryFormProps };
