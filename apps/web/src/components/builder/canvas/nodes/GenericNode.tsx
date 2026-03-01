import type { NodeProps } from "reactflow";

import type { AgentNodeData, ResponseNodeData } from "@shared/contracts/flow/types";

import type { BuilderNodeData } from "@/lib/reactflow/rf.types";

import { NodeCard } from "./components/NodeCard";

export function GenericNode({ data, selected }: NodeProps<BuilderNodeData>) {
  const isResponseNode = data.contractType === "response";
  
 
    const getNodeConfig = (data: BuilderNodeData): ResponseNodeData | AgentNodeData => {
      return data.contractType === "response" 
        ? (data.config as ResponseNodeData) 
        : (data.config as AgentNodeData);
    };
    const config = getNodeConfig(data);

    const getNodeSummary = (data: BuilderNodeData, config: ResponseNodeData | AgentNodeData): string => {
      if (data.contractType === "response") {
        const responseConfig = config as ResponseNodeData;
        return responseConfig.endSession ? "Cierra sesion" : "Mantiene sesion abierta";
      }

      const agentConfig = config as AgentNodeData;
      return agentConfig.instructions?.trim() || "Agente generico conversacional.";
    };

     const title = config.title?.trim() || "Generic";

    const summary = getNodeSummary(data, config);

  return (
    <NodeCard
      variant="generic"
      selected={selected}
      eyebrow={isResponseNode ? "response" : "agent/generic"}
      title={title}
      summary={summary}
    />
  );
}
