import type { GetFlowResponse } from "@devday/shared";

import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";
import type { IGetFlowUseCaseDependencies } from "./IGetFlowUseCaseDependencies.js";

export class GetFlowUseCase {
  constructor(private readonly dependencies: IGetFlowUseCaseDependencies) {}

  async execute(flowId: string): Promise<GetFlowResponse> {
    const flowDefinition = await this.dependencies.flowRepository.getById(flowId);
    if (!flowDefinition) {
      throw new FlowNotFoundError(flowId);
    }

    return {
      flow: flowDefinition
    };
  }
}
