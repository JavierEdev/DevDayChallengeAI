import type { IChatChannelSender } from "../../../domain/channel/IChatChannelSender.js";

export interface ITelegramBotApiSenderOptions {
  botToken: string;
  apiBaseUrl?: string;
}

export class TelegramBotApiSender implements IChatChannelSender {
  private readonly apiBaseUrl: string;
  private readonly botToken: string;

  constructor(options: ITelegramBotApiSenderOptions) {
    this.botToken = options.botToken;
    this.apiBaseUrl = options.apiBaseUrl ?? "https://api.telegram.org";
  }

  async sendText(externalChatId: string, text: string): Promise<void> {
    const endpoint = `${this.apiBaseUrl}/bot${this.botToken}/sendMessage`;
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        chat_id: externalChatId,
        text
      })
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Telegram sendMessage failed (${response.status}): ${body}`);
    }
  }
}
