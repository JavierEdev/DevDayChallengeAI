import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";

export interface IUpdateFlowUseCaseDependencies {
  flowRepository: IFlowRepository;
}
