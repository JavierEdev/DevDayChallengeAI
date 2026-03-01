import type { CSSProperties} from "react";
import type { SplitPaneProps } from "./interfaces/SplitPanelProps";

export function SplitPane({
  left,
  center,
  right,
  leftWidth = 260,
  rightWidth = 340
}: Readonly<SplitPaneProps>) {
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
