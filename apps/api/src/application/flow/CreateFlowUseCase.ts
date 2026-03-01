import type { CreateFlowRequest, CreateFlowResponse } from "@devday/shared";

import { FlowAlreadyExistsError } from "../errors/FlowAlreadyExistsError.js";
import type { ICreateFlowUseCaseDependencies } from "./ICreateFlowUseCaseDependencies.js";

export class CreateFlowUseCase {
  constructor(private readonly dependencies: ICreateFlowUseCaseDependencies) {}

  async execute(input: CreateFlowRequest): Promise<CreateFlowResponse> {
    const existingFlowDefinition = await this.dependencies.flowRepository.getById(input.id);
    if (existingFlowDefinition) {
      throw new FlowAlreadyExistsError(input.id);
    }

    const nowIso = new Date().toISOString();
    const flowDefinition = {
      ...input,
      createdAt: input.createdAt ?? nowIso,
      updatedAt: nowIso
    };

    await this.dependencies.flowRepository.create(flowDefinition);

    return {
      flow: flowDefinition
    };
  }
}
