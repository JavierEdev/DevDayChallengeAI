import type { FlowDefinition } from "@devday/shared";

export interface IFlowRepository {
  create(flowDefinition: FlowDefinition): Promise<void>;
  getById(flowId: string): Promise<FlowDefinition | null>;
  update(flowDefinition: FlowDefinition): Promise<void>;
  deleteById(flowId: string): Promise<boolean>;
}
