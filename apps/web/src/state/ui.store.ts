import { create } from "zustand";

interface UiStoreState {
  leftSidebarOpen: boolean;
  rightSidebarOpen: boolean;
  chatOpen: boolean;
  toggleLeftSidebar: () => void;
  toggleRightSidebar: () => void;
  toggleChat: () => void;
}

export const useUiStore = create<UiStoreState>((set) => ({
  leftSidebarOpen: true,
  rightSidebarOpen: true,
  chatOpen: true,

  toggleLeftSidebar: () =>
    set((state) => ({
      leftSidebarOpen: !state.leftSidebarOpen
    })),

  toggleRightSidebar: () =>
    set((state) => ({
      rightSidebarOpen: !state.rightSidebarOpen
    })),

  toggleChat: () =>
    set((state) => ({
      chatOpen: !state.chatOpen
    }))
}));
