import type { CSSProperties, ReactNode } from "react";

interface SplitPaneProps {
  left: ReactNode;
  center: ReactNode;
  right: ReactNode;
  leftWidth?: number;
  rightWidth?: number;
}

export function SplitPane({
  left,
  center,
  right,
  leftWidth = 260,
  rightWidth = 340
}: SplitPaneProps) {
  const style = {
    "--left-pane-width": `${leftWidth}px`,
    "--right-pane-width": `${rightWidth}px`
  } as CSSProperties;

  return (
    <section className="split-pane" style={style}>
      <aside className="split-pane__left">{left}</aside>
      <section className="split-pane__center">{center}</section>
      <aside className="split-pane__right">{right}</aside>
    </section>
  );
}
