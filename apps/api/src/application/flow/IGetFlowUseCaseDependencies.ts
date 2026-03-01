import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";

export interface IGetFlowUseCaseDependencies {
  flowRepository: IFlowRepository;
}
