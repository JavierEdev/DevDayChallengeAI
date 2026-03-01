import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";

export interface IDeleteFlowUseCaseDependencies {
  flowRepository: IFlowRepository;
}
