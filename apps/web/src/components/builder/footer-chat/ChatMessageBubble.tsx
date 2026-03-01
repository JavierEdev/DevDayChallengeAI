import { FOOTER_CHAT_TEXT } from "./data/footerChatText";
import type { ChatMessageBubbleProps } from "./interfaces/ChatMessageBubbleProps";

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return FOOTER_CHAT_TEXT.invalidTime;
  }

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

export function ChatMessageBubble({ message }: ChatMessageBubbleProps) {
  return (
    <article className={`chat-bubble chat-bubble--${message.role}`}>
      <header className="chat-bubble__header">
        <span className="chat-bubble__role">{message.role}</span>
        <time className="chat-bubble__time" dateTime={message.createdAt}>
          {formatTime(message.createdAt)}
        </time>
      </header>
      <p className="chat-bubble__content">{message.content}</p>
    </article>
  );
}
