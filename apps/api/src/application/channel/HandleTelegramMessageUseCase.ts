import type { CreateSessionUseCase } from "../session/CreateSessionUseCase.js";
import type { RunConversationTurnUseCase } from "../chat/RunConversationTurnUseCase.js";
import { SessionNotFoundError } from "../errors/SessionNotFoundError.js";
import type { IChatChannelSender } from "../../domain/channel/IChatChannelSender.js";
import type { IExternalSessionLinkStore } from "../../domain/session/IExternalSessionLinkStore.js";

export interface IHandleTelegramMessageInput {
  externalChatId: string;
  text: string;
  flowId: string;
}

export class HandleTelegramMessageUseCase {
  constructor(
    private readonly externalSessionLinkStore: IExternalSessionLinkStore,
    private readonly createSessionUseCase: CreateSessionUseCase,
    private readonly runConversationTurnUseCase: RunConversationTurnUseCase,
    private readonly channelSender: IChatChannelSender
  ) {}

  async execute(input: IHandleTelegramMessageInput): Promise<void> {
    const externalUserId = `telegram:${input.externalChatId}`;
    let sessionId = await this.externalSessionLinkStore.getSessionIdByExternalUserId(externalUserId);

    if (!sessionId) {
      sessionId = await this.createSession(externalUserId, input.flowId, input.externalChatId);
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
      sessionId = await this.createSession(externalUserId, input.flowId, input.externalChatId);
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
