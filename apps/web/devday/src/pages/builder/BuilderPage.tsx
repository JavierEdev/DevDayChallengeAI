import { ChatDock } from "@/components/builder/footer-chat/ChatDock";
import { AgentPalette } from "@/components/builder/left-sidebar/AgentPalette";
import { InspectorPanel } from "@/components/builder/right-sidebar/InspectorPanel";
import { BuilderToolbar } from "@/components/builder/toolbar/BuilderToolbar";
import { FlowCanvas } from "@/components/builder/canvas/FlowCanvas";
import { useUiStore } from "@/state/ui.store";

import { BuilderLayout } from "./builder.layout";

export function BuilderPage() {
  const leftSidebarOpen = useUiStore((state) => state.leftSidebarOpen);
  const rightSidebarOpen = useUiStore((state) => state.rightSidebarOpen);
  const chatOpen = useUiStore((state) => state.chatOpen);

  return (
    <BuilderLayout
      toolbar={<BuilderToolbar />}
      leftSidebar={
        leftSidebarOpen ? (
          <AgentPalette />
        ) : (
          <section className="panel">
            <div className="panel__body">
              <p className="muted">Palette oculta.</p>
            </div>
          </section>
        )
      }
      canvas={<FlowCanvas />}
      rightSidebar={
        rightSidebarOpen ? (
          <InspectorPanel />
        ) : (
          <section className="panel">
            <div className="panel__body">
              <p className="muted">Inspector oculto.</p>
            </div>
          </section>
        )
      }
      footer={
        chatOpen ? (
          <ChatDock />
        ) : (
          <section className="chat-dock">
            <p className="muted">Chat oculto.</p>
          </section>
        )
      }
    />
  );
}
