import type { NodeProps } from "reactflow";

import type { ValidatorNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

import { NodeCard } from "./components/NodeCard";

export function ValidatorNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const config = data.config as ValidatorNodeData;
  const title = config.title?.trim() || "Validator";
  const rules = Array.isArray(config.rules) ? config.rules : [];
  const requiredFields = Array.isArray(config.requiredFields) ? config.requiredFields : [];
  const hasRules = rules.length > 0;
  const hasRequiredFields = requiredFields.length > 0;
  const summaryCount = hasRules
    ? rules.length
    : hasRequiredFields
      ? requiredFields.length
      : 0;
  const summaryUnit = hasRules ? "reglas" : "campos";
  const summary = `${config.mode ?? "all"} | ${summaryCount} ${summaryUnit}`;

  return (
    <NodeCard
      variant="validator"
      selected={selected}
      eyebrow="validator"
      title={title}
      summary={summary}
    />
  );
}
