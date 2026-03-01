import type { UpdateFlowRequest, UpdateFlowResponse } from "@devday/shared";

import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";
import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";

export class UpdateFlowUseCase {
  constructor(private readonly flowRepository: IFlowRepository) {}

  async execute(flowId: string, input: UpdateFlowRequest): Promise<UpdateFlowResponse> {
    const existingFlowDefinition = await this.flowRepository.getById(flowId);
    if (!existingFlowDefinition) {
      throw new FlowNotFoundError(flowId);
    }

    const nowIso = new Date().toISOString();
    const nextVersion = Math.max(existingFlowDefinition.version + 1, input.version);
    const flowDefinition = {
      ...input,
      id: flowId,
      version: nextVersion,
      createdAt: existingFlowDefinition.createdAt ?? input.createdAt ?? nowIso,
      updatedAt: nowIso
    };

    await this.flowRepository.update(flowDefinition);

    return {
      flow: flowDefinition
    };
  }
}
