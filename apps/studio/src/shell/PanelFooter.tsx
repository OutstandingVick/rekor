import type { ReactNode } from "react";

/** Sticky action row at the bottom of the side panel: status on the left, primary action on the right. */
export function PanelFooter({ status, tone = "neutral", action }: { status: ReactNode; tone?: "ok" | "bad" | "neutral"; action?: ReactNode }) {
  return (
    <div className="panel-foot">
      <div className={`panel-status ${tone}`}>{status}</div>
      {action}
    </div>
  );
}
