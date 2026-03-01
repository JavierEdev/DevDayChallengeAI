import { useChatStore } from "@/state/chat.store";

import { ChatInput } from "./ChatInput";
import { ChatMessages } from "./ChatMessages";

export function ChatDock() {
  const sessionId = useChatStore((state) => state.sessionId);
  const lastError = useChatStore((state) => state.lastError);
  const resetChat = useChatStore((state) => state.resetChat);

  return (
    <section className="chat-dock">
      <header className="chat-dock__header">
        <div>
          <p className="panel-title">Runtime Chat</p>
          <p className="panel-subtitle">
            {sessionId ? `session: ${sessionId}` : "sin sesion iniciada"}
          </p>
        </div>
        <button type="button" className="inspector-button is-muted" onClick={resetChat}>
          Limpiar
        </button>
      </header>
      <ChatMessages />
      <ChatInput />
      {lastError ? <p className="inspector-error">{lastError}</p> : null}
    </section>
  );
}
