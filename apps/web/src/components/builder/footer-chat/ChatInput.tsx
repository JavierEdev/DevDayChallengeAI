import type { FormEvent } from "react";

import { useChatStore } from "@/state/chat.store";
import { FOOTER_CHAT_TEXT } from "./data/footerChatText";

export function ChatInput() {
  const input = useChatStore((state) => state.input);
  const setInput = useChatStore((state) => state.setInput);
  const sendMessage = useChatStore((state) => state.sendMessage);
  const isSending = useChatStore((state) => state.isSending);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void sendMessage();
  };

  return (
    <form className="chat-input" onSubmit={handleSubmit}>
      <input
        className="chat-input__textbox"
        value={input}
        placeholder={FOOTER_CHAT_TEXT.inputPlaceholder}
        onChange={(event) => setInput(event.target.value)}
      />
      <button type="submit" className="chat-input__send" disabled={isSending}>
        {isSending ? FOOTER_CHAT_TEXT.sendingShort : FOOTER_CHAT_TEXT.sendButton}
      </button>
    </form>
  );
}
