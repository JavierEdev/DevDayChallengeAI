import type { IAgentLlmPort } from "../../domain/agent/IAgentLlmPort.js";
import type { IFlowRepository } from "../../domain/flow/IFlowRepository.js";
import type { ISessionStateStore } from "../../domain/session/ISessionStateStore.js";
import type { IToolRepository } from "../../domain/tool/IToolRepository.js";

export interface IRunConversationTurnUseCaseDependencies {
  sessionStateStore: ISessionStateStore;
  flowRepository: IFlowRepository;
  toolRepository: IToolRepository;
  agentLlmPort: IAgentLlmPort;
}
