import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";

export interface ICreateFlowUseCaseDependencies {
  flowRepository: IFlowRepository;
}
