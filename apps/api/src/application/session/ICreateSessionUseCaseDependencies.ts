import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";
import type { ISessionStateStore } from "../../domain/session/ISessionStateStore.js";

export interface ICreateSessionUseCaseDependencies {
  sessionStateStore: ISessionStateStore;
  flowRepository: IFlowRepository;
}
