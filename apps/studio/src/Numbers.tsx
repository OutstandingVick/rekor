import { sol } from "./format";
import type { Headline } from "./metrics";
import "./numbers.css";

export function Numbers({ h }: { h: Headline }) {
  const items = [
    { label: "graduation MC", value: `${sol(h.graduationMcSol)}`, unit: "SOL", note: `at ${sol(h.thresholdSol)} SOL raised` },
    {
      label: "cost to snipe 5%",
      value: h.snipe5Capped ? "—" : sol(h.snipe5Sol),
      unit: h.snipe5Capped ? "" : "SOL",
      note: h.snipe5Capped ? "curve graduates before 5% sells" : "fee included",
    },
    { label: "creator fees at graduation", value: sol(h.creatorFeesSol), unit: "SOL", note: "buy-only volume" },
    { label: "partner fees at graduation", value: sol(h.partnerFeesSol), unit: "SOL", note: "buy-only volume" },
  ];
  return (
    <section className="numbers" aria-label="Headline numbers">
      {items.map((it) => (
        <div key={it.label} className="number">
          <div className="label">{it.label}</div>
          <div className="value">
            {it.value}
            {it.unit && <span className="unit"> {it.unit}</span>}
          </div>
          <div className="note">{it.note}</div>
        </div>
      ))}
    </section>
  );
}
