import { randomUUID } from "node:crypto";
import { FlowAlreadyExistsError } from "../errors/FlowAlreadyExistsError.js";

import type { CreateFlowRequest, CreateFlowResponse } from "@devday/shared";
import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";

export class CreateFlowUseCase {
  constructor(private readonly flowRepository: IFlowRepository) {}

  async execute(input: CreateFlowRequest): Promise<CreateFlowResponse> {
    const flowId = this.newId();
    const existingFlowDefinition = await this.flowRepository.getById(flowId);
    if (existingFlowDefinition) {
      throw new FlowAlreadyExistsError(flowId);
    }

    console.log("Creating flow with ID:", flowId);

    const nowIso = new Date().toISOString();
    const flowDefinition = {
      ...input,
      id: flowId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await this.flowRepository.create(flowDefinition);

    return {
      flow: flowDefinition,
    };
  }

  private newId(): string {
    return randomUUID();
  }
}
