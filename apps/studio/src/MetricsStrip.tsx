import { price, sol } from "./format";
import type { Headline } from "./metrics";
import "./metrics-strip.css";

interface Cell {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  emphasis?: boolean;
}

/** One compact row of outputs directly under the curve. */
export function MetricsStrip({ h }: { h: Headline }) {
  const cells: Cell[] = [
    { label: "Graduation MC", value: sol(h.graduationMcSol), unit: "SOL", emphasis: true },
    { label: "Raise target", value: sol(h.thresholdSol), unit: "SOL", note: "SOL raised at graduation" },
    { label: "Graduation price", value: price(h.graduationPrice), unit: "SOL" },
    { label: "Cost to acquire 1%", value: h.acquire1Capped ? "—" : sol(h.acquire1Sol), unit: h.acquire1Capped ? undefined : "SOL", note: "fee included" },
    { label: "Cost to snipe 5%", value: h.snipe5Capped ? "—" : sol(h.snipe5Sol), unit: h.snipe5Capped ? undefined : "SOL", note: h.snipe5Capped ? "graduates before 5% sells" : "fee included", emphasis: true },
    { label: "Creator fees", value: sol(h.creatorFeesSol), unit: "SOL", note: "at graduation, buy-only" },
    { label: "Partner fees", value: sol(h.partnerFeesSol), unit: "SOL", note: "at graduation, buy-only" },
  ];
  return (
    <section className="metrics-strip" aria-label="Curve outputs">
      {cells.map((c) => (
        <div key={c.label} className={`metric ${c.emphasis ? "em" : ""}`} title={c.note}>
          <div className="m-label">{c.label}</div>
          <div className="m-value">
            {c.value}
            {c.unit && <span className="m-unit"> {c.unit}</span>}
          </div>
        </div>
      ))}
    </section>
  );
}
