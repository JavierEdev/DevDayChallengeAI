import type { AgentNodeData } from "@shared/contracts/flow/types";

interface SpecialistFormProps {
  data: AgentNodeData;
  onChange: (patch: Partial<AgentNodeData>) => void;
}

export type { SpecialistFormProps };
