import type { ReactNode } from "react";
import { arrowNav } from "../useArrowNav";
import "./lower.css";

export type LowerTab = "segments" | "simulation" | "fills" | "transactions" | "verification";

export const LOWER_TABS: { id: LowerTab; label: string }[] = [
  { id: "segments", label: "Segments" },
  { id: "simulation", label: "Simulation" },
  { id: "fills", label: "Live Fills" },
  { id: "transactions", label: "Transactions" },
  { id: "verification", label: "Curve Math / Verification" },
];

export interface LowerPanelProps {
  tab: LowerTab;
  onTab: (t: LowerTab) => void;
  counts?: Partial<Record<LowerTab, number>>;
  children: ReactNode;
  collapsed: boolean;
  onCollapse: (c: boolean) => void;
}

/** Terminal-style tabbed data area under the chart. */
export function LowerPanel({ tab, onTab, counts = {}, children, collapsed, onCollapse }: LowerPanelProps) {
  return (
    <section className={`lower ${collapsed ? "collapsed" : ""}`} aria-label="Data">
      <div className="lower-tabs" role="tablist" onKeyDown={arrowNav}>
        {LOWER_TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} tabIndex={tab === t.id ? 0 : -1} className={tab === t.id ? "on" : ""} onClick={() => { onTab(t.id); onCollapse(false); }}>
            {t.label}
            {counts[t.id] ? <span className="cnt">{counts[t.id]}</span> : null}
          </button>
        ))}
        <button type="button" className="collapse" aria-expanded={!collapsed} onClick={() => onCollapse(!collapsed)} title={collapsed ? "Show data panel" : "Hide data panel to enlarge the chart"}>
          {collapsed ? "▲" : "▼"}
        </button>
      </div>
      {!collapsed && <div className="lower-body" role="tabpanel">{children}</div>}
    </section>
  );
}
