import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/AppShell";
import { SplitPane } from "@/components/layout/SplitPane";

interface BuilderLayoutProps {
  toolbar: ReactNode;
  leftSidebar: ReactNode;
  canvas: ReactNode;
  rightSidebar: ReactNode;
  footer: ReactNode;
}

export function BuilderLayout({
  toolbar,
  leftSidebar,
  canvas,
  rightSidebar,
  footer
}: Readonly<BuilderLayoutProps>) {
  return (
    <div className="builder-page">
      <AppShell
        header={toolbar}
        footer={footer}
      >
        <SplitPane
          left={leftSidebar}
          center={canvas}
          right={rightSidebar}
        />
      </AppShell>
    </div>
  );
}
