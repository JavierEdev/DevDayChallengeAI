import { useChatStore } from "@/state/chat.store";
import { FOOTER_CHAT_TEXT } from "./data/footerChatText";

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
          <p className="panel-title">{FOOTER_CHAT_TEXT.title}</p>
          <p className="panel-subtitle">
            {sessionId ? `session: ${sessionId}` : FOOTER_CHAT_TEXT.noSession}
          </p>
        </div>
        <button type="button" className="inspector-button is-muted" onClick={resetChat}>
          {FOOTER_CHAT_TEXT.clearButton}
        </button>
      </header>
      <ChatMessages />
      <ChatInput />
      {lastError ? <p className="inspector-error">{lastError}</p> : null}
    </section>
  );
}
