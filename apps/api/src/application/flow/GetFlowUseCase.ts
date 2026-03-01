import type { GetFlowResponse } from "@devday/shared";

import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";
import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";

export class GetFlowUseCase {
  constructor(private readonly flowRepository: IFlowRepository) {}

  async execute(flowId: string): Promise<GetFlowResponse> {
    const flowDefinition = await this.flowRepository.getById(flowId);
    if (!flowDefinition) {
      throw new FlowNotFoundError(flowId);
    }

    return {
      flow: flowDefinition
    };
  }
}
