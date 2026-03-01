import type { FlowDefinition } from "@devday/shared";

import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";

export class InMemoryFlowRepository implements IFlowRepository {
  private readonly flows = new Map<string, FlowDefinition>();

  async create(flowDefinition: FlowDefinition): Promise<void> {
    this.flows.set(flowDefinition.id, this.clone(flowDefinition));
  }

  async getById(flowId: string): Promise<FlowDefinition | null> {
    const flowDefinition = this.flows.get(flowId);
    return flowDefinition ? this.clone(flowDefinition) : null;
  }

  async update(flowDefinition: FlowDefinition): Promise<void> {
    this.flows.set(flowDefinition.id, this.clone(flowDefinition));
  }

  async deleteById(flowId: string): Promise<boolean> {
    return this.flows.delete(flowId);
  }

  private clone<TValue>(value: TValue): TValue {
    return structuredClone(value);
  }
}
