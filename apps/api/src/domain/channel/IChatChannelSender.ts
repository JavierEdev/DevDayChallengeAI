export interface IChatChannelSender {
  sendText(externalChatId: string, text: string): Promise<void>;
}
