import { useMemo, useState } from "react";
import { analyze } from "./analysis";
import { Chart } from "./Chart";
import { DEFAULT_DESIGN, type Design } from "./design";
import { headline } from "./metrics";
import { pricePath } from "./path";
import "./layout.css";

export function App() {
  const [design] = useState<Design>(DEFAULT_DESIGN);
  const analysis = useMemo(() => analyze(design), [design]);
  const numbers = useMemo(() => (analysis.ok ? headline(design, analysis.solved, analysis.fees) : null), [analysis, design]);
  const path = useMemo(() => (analysis.ok ? pricePath(design, analysis.solved) : []), [analysis, design]);

  return (
    <div className="app">
      <aside className="zone zone-config" aria-label="Curve configuration" />
      <main className="zone zone-stage">
        {analysis.ok ? <Chart path={path} graduationMcSol={numbers!.graduationMcSol} /> : <div className="stage-error" role="alert">{analysis.error}</div>}
      </main>
      <aside className="zone zone-side" aria-label="Simulate" />
      <footer className="zone zone-export" />
    </div>
  );
}
