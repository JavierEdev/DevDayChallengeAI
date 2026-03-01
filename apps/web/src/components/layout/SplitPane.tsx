import type { CSSProperties } from "react";

import type { SplitPaneProps } from "./interfaces/SplitPanelProps";

export function SplitPane({
  left,
  center,
  right,
  leftWidth = 260,
  rightWidth = 340
}: Readonly<SplitPaneProps>) {
  const hasLeft = left != null;
  const hasRight = right != null;
  const style = {
    "--left-pane-width": `${leftWidth}px`,
    "--right-pane-width": `${rightWidth}px`
  } as CSSProperties;

  return (
    <section
      className={`split-pane ${hasLeft ? "has-left" : ""} ${hasRight ? "has-right" : ""}`.trim()}
      style={style}
    >
      {hasLeft ? <aside className="split-pane__left">{left}</aside> : null}
      <section className="split-pane__center">{center}</section>
      {hasRight ? <aside className="split-pane__right">{right}</aside> : null}
    </section>
  );
}
