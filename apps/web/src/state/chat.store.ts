import { create } from "zustand";

import type { SessionMessage } from "@shared/contracts/runtime/types";

import { createSession, sendMessage } from "@/services/flow-executor.api";
import { useFlowStore } from "@/state/flow.store";

interface ChatStoreState {
  sessionId: string | null;
  input: string;
  messages: SessionMessage[];
  isSending: boolean;
  lastError: string | null;
  setInput: (value: string) => void;
  resetChat: () => void;
  startSession: () => Promise<string | null>;
  sendMessage: (rawMessage?: string) => Promise<void>;
}

function normalizeError(error: unknown): string {
  return error instanceof Error ? error.message : "Unexpected chat error.";
}

export const useChatStore = create<ChatStoreState>((set, get) => ({
  sessionId: null,
  input: "",
  messages: [],
  isSending: false,
  lastError: null,

  setInput: (value) => set({ input: value }),

  resetChat: () =>
    set({
      sessionId: null,
      input: "",
      messages: [],
      isSending: false,
      lastError: null
    }),

  startSession: async () => {
    const flowStore = useFlowStore.getState();
    const savedFlow = await flowStore.saveFlow();
    if (!savedFlow) {
      set({ lastError: "No fue posible guardar el flujo." });
      return null;
    }

    try {
      const response = await createSession(savedFlow.id);
      set({
        sessionId: response.session.id,
        messages: response.session.messages,
        lastError: null
      });
      return response.session.id;
    } catch (error) {
      set({ lastError: normalizeError(error) });
      return null;
    }
  },

  sendMessage: async (rawMessage) => {
    if (get().isSending) {
      return;
    }

    const message = (rawMessage ?? get().input).trim();
    if (!message) {
      return;
    }

    set({ isSending: true, lastError: null, input: "" });
    try {
      let sessionId = get().sessionId;
      if (!sessionId) {
        sessionId = await get().startSession();
      }
      if (!sessionId) {
        return;
      }

      const response = await sendMessage(sessionId, message);
      set({
        messages: response.session.messages
      });
    } catch (error) {
      set({ lastError: normalizeError(error) });
    } finally {
      set({ isSending: false });
    }
  }
}));
