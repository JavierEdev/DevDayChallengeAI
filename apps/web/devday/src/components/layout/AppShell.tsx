import type { PropsWithChildren, ReactNode } from "react";

interface AppShellProps extends PropsWithChildren {
  header?: ReactNode;
  footer?: ReactNode;
}

export function AppShell({ header, footer, children }: AppShellProps) {
  return (
    <div className="app-shell">
      {header ? <header className="app-shell__header">{header}</header> : null}
      <main className="app-shell__body">{children}</main>
      {footer ? <footer className="app-shell__footer">{footer}</footer> : null}
    </div>
  );
}
