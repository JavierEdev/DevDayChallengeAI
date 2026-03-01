import type { DeleteFlowResponse } from "@devday/shared";

import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";
import type { IDeleteFlowUseCaseDependencies } from "./IDeleteFlowUseCaseDependencies.js";

export class DeleteFlowUseCase {
  constructor(private readonly dependencies: IDeleteFlowUseCaseDependencies) {}

  async execute(flowId: string): Promise<DeleteFlowResponse> {
    const existingFlowDefinition = await this.dependencies.flowRepository.getById(flowId);
    if (!existingFlowDefinition) {
      throw new FlowNotFoundError(flowId);
    }

    const deleted = await this.dependencies.flowRepository.deleteById(flowId);

    return {
      flowId,
      deleted
    };
  }
}
