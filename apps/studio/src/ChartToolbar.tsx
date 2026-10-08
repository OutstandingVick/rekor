import type { ReactNode } from "react";

/** Title row above the chart: what is plotted on the left, overlay controls on the right. */
export function ChartToolbar({ children }: { children?: ReactNode }) {
  return (
    <div className="chart-toolbar">
      <div className="chart-title">
        <strong>Price</strong>
        <span>vs tokens sold · SOL per token</span>
      </div>
      <div className="chart-tools">{children}</div>
    </div>
  );
}
