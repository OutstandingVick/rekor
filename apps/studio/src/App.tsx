import { useMemo, useState } from "react";
import { analyze } from "./analysis";
import { Chart } from "./Chart";
import { ConfigPanel } from "./ConfigPanel";
import { DEFAULT_DESIGN, type Design } from "./design";
import { inspectAt } from "./inspect";
import { headline } from "./metrics";
import { Numbers } from "./Numbers";
import { pricePath } from "./path";
import "./layout.css";

export function App() {
  const [probeSol] = useState(1);
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const set = (patch: Partial<Design>) => setDesign((d) => ({ ...d, ...patch }));
  const analysis = useMemo(() => analyze(design), [design]);
  const numbers = useMemo(() => (analysis.ok ? headline(design, analysis.solved, analysis.fees) : null), [analysis, design]);
  const maxThresholdSol = useMemo(() => {
    const a = analyze({ ...design, thresholdSol: null });
    return a.ok ? Number(a.solved.config.migrationQuoteThreshold) / 1e9 : null;
  }, [design]);
  const path = useMemo(() => (analysis.ok ? pricePath(design, analysis.solved) : []), [analysis, design]);

  return (
    <div className="app">
      <aside className="zone zone-config" aria-label="Curve configuration">
        <ConfigPanel design={design} set={set} maxThresholdSol={maxThresholdSol} />
      </aside>
      <main className="zone zone-stage">
        {analysis.ok ? (
          <>
            <Chart path={path} graduationMcSol={numbers!.graduationMcSol} supplyTokens={design.supplyTokens}
              probeSol={probeSol}
              inspect={(sp) => inspectAt(analysis.solved, analysis.fees, sp, probeSol)}
            />
            <Numbers h={numbers!} />
          </>
        ) : (
          <div className="stage-error" role="alert">{analysis.error}</div>
        )}
      </main>
      <aside className="zone zone-side" aria-label="Simulate" />
      <footer className="zone zone-export" />
    </div>
  );
}
