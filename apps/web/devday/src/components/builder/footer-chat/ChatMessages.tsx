import { useChatStore } from "@/state/chat.store";

import { ChatMessageBubble } from "./ChatMessageBubble";

export function ChatMessages() {
  const messages = useChatStore((state) => state.messages);
  const isSending = useChatStore((state) => state.isSending);

  if (messages.length === 0) {
    return (
      <div className="chat-messages">
        <p className="muted">No hay mensajes todavía. Inicia la conversación.</p>
      </div>
    );
  }

  return (
    <div className="chat-messages">
      {messages.map((message) => (
        <ChatMessageBubble key={message.id} message={message} />
      ))}
      {isSending ? <p className="muted">Enviando...</p> : null}
    </div>
  );
}
