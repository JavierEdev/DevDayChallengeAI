import type { CreateSessionUseCase } from "../session/CreateSessionUseCase.js";
import type { GetFlowUseCase } from "../flow/GetFlowUseCase.js";
import type { RunConversationTurnUseCase } from "../chat/RunConversationTurnUseCase.js";
import { FlowNotFoundError } from "../errors/FlowNotFoundError.js";
import { SessionNotFoundError } from "../errors/SessionNotFoundError.js";
import type { IChatChannelSender } from "../../domain/channel/IChatChannelSender.js";
import type { IExternalSessionLinkStore } from "../../domain/session/IExternalSessionLinkStore.js";

export interface IHandleTelegramMessageInput {
  externalChatId: string;
  text: string;
  fallbackFlowId?: string;
}

export class HandleTelegramMessageUseCase {
  constructor(
    private readonly externalSessionLinkStore: IExternalSessionLinkStore,
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly getFlowUseCase: GetFlowUseCase,
    private readonly runConversationTurnUseCase: RunConversationTurnUseCase,
    private readonly channelSender: IChatChannelSender
  ) {}

  async execute(input: IHandleTelegramMessageInput): Promise<void> {
    const externalUserId = `telegram:${input.externalChatId}`;
    const commandHandled = await this.tryHandleCommand(externalUserId, input);
    if (commandHandled) {
      return;
    }

    let sessionId = await this.externalSessionLinkStore.getSessionIdByExternalUserId(externalUserId);
    const preferredFlowId =
      await this.externalSessionLinkStore.getPreferredFlowIdByExternalUserId(externalUserId);
    const activeFlowId = preferredFlowId ?? input.fallbackFlowId;

    if (!sessionId) {
      if (!activeFlowId) {
        await this.channelSender.sendText(
          input.externalChatId,
          "No hay flow configurado. Envia: /flow <FLOW_ID>"
        );
        return;
      }
      sessionId = await this.createSession(externalUserId, activeFlowId, input.externalChatId);
    }

    let result;
    try {
      result = await this.runConversationTurnUseCase.execute({
        sessionId,
        message: input.text,
        metadata: {
          channel: "telegram",
          externalChatId: input.externalChatId
        }
      });
    } catch (error) {
      if (!(error instanceof SessionNotFoundError)) {
        throw error;
      }

      // Si el mapeo quedo stale, recreamos sesion y reintentamos una vez.
      if (!activeFlowId) {
        await this.channelSender.sendText(
          input.externalChatId,
          "La sesion expiro y no hay flow configurado. Envia: /flow <FLOW_ID>"
        );
        return;
      }
      sessionId = await this.createSession(externalUserId, activeFlowId, input.externalChatId);
      result = await this.runConversationTurnUseCase.execute({
        sessionId,
        message: input.text,
        metadata: {
          channel: "telegram",
          externalChatId: input.externalChatId
        }
      });
    }

    const assistantReply = result.assistantMessage?.content?.trim();
    if (!assistantReply) {
      return;
    }

    await this.channelSender.sendText(input.externalChatId, assistantReply);
  }

  private async tryHandleCommand(
    externalUserId: string,
    input: IHandleTelegramMessageInput
  ): Promise<boolean> {
    const trimmedText = input.text.trim();
    if (!trimmedText.startsWith("/")) {
      return false;
    }

    if (trimmedText === "/flow") {
      const currentFlowId =
        await this.externalSessionLinkStore.getPreferredFlowIdByExternalUserId(externalUserId);
      if (!currentFlowId) {
        await this.channelSender.sendText(
          input.externalChatId,
          "No hay flow configurado. Envia: /flow <FLOW_ID>"
        );
        return true;
      }

      await this.channelSender.sendText(input.externalChatId, `Flow actual: ${currentFlowId}`);
      return true;
    }

    if (trimmedText === "/reset") {
      await this.externalSessionLinkStore.clearLink(externalUserId);
      await this.channelSender.sendText(
        input.externalChatId,
        "Sesion reiniciada. Si quieres cambiar flujo, envia: /flow <FLOW_ID>"
      );
      return true;
    }

    if (!trimmedText.startsWith("/flow ")) {
      await this.channelSender.sendText(
        input.externalChatId,
        "Comando no soportado. Usa /flow <FLOW_ID> para configurar el flujo."
      );
      return true;
    }

    const flowId = trimmedText.replace("/flow", "").trim();
    if (!flowId) {
      await this.channelSender.sendText(
        input.externalChatId,
        "Formato invalido. Uso correcto: /flow <FLOW_ID>"
      );
      return true;
    }

    try {
      const flow = await this.getFlowUseCase.execute(flowId);
      await this.externalSessionLinkStore.savePreferredFlowId(externalUserId, flowId);
      await this.externalSessionLinkStore.clearLink(externalUserId);
      await this.channelSender.sendText(
        input.externalChatId,
        `Flow configurado: ${flow.flow.name} (${flow.flow.id}). Ya puedes enviar mensajes.`
      );
      return true;
    } catch (error) {
      if (error instanceof FlowNotFoundError) {
        await this.channelSender.sendText(
          input.externalChatId,
          `Flow no encontrado: ${flowId}. Verifica el ID y vuelve a intentar.`
        );
        return true;
      }

      throw error;
    }
  }

  private async createSession(
    externalUserId: string,
    flowId: string,
    externalChatId: string
  ): Promise<string> {
    const createdSession = await this.createSessionUseCase.execute({
      flowId,
      externalUserId,
      initialVariables: {
        channel: "telegram",
        externalChatId
      }
    });

    const sessionId = createdSession.session.id;
    await this.externalSessionLinkStore.saveLink(externalUserId, sessionId);
    return sessionId;
  }
}
