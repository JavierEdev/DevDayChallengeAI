import type { DeleteFlowResponse } from "@devday/shared";

import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";
import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";

export class DeleteFlowUseCase {
  constructor(private readonly flowRepository: IFlowRepository) {}

  async execute(flowId: string): Promise<DeleteFlowResponse> {
    const existingFlowDefinition = await this.flowRepository.getById(flowId);
    if (!existingFlowDefinition) {
      throw new FlowNotFoundError(flowId);
    }

    const deleted = await this.flowRepository.deleteById(flowId);

    return {
      flowId,
      deleted
    };
  }
}
