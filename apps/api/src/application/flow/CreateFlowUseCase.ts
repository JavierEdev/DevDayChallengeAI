import { randomUUID } from "node:crypto";
import { FlowAlreadyExistsError } from "../errors/FlowAlreadyExistsError.js";

import type { CreateFlowRequest, CreateFlowResponse } from "@devday/shared";
import type { ICreateFlowUseCaseDependencies } from "./ICreateFlowUseCaseDependencies.js";

export class CreateFlowUseCase {
  constructor(private readonly dependencies: ICreateFlowUseCaseDependencies) {}

  async execute(input: CreateFlowRequest): Promise<CreateFlowResponse> {
    const flowId = this.newId();
    const existingFlowDefinition =
      await this.dependencies.flowRepository.getById(flowId);
    if (existingFlowDefinition) {
      throw new FlowAlreadyExistsError(flowId);
    }

    const nowIso = new Date().toISOString();
    const flowDefinition = {
      ...input,
      id: flowId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    await this.dependencies.flowRepository.create(flowDefinition);

    return {
      flow: flowDefinition,
    };
  }

  private newId(): string {
    return randomUUID();
  }
}
