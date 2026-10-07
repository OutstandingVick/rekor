import { useEffect, useMemo, useState } from "react";
import { analyze } from "./analysis";
import { Chart } from "./Chart";
import { useDeployment } from "./chain/useDeployment";
import { ConfigPanel } from "./ConfigPanel";
import { DeployPanel } from "./DeployPanel";
import { DEFAULT_DESIGN, type Design } from "./design";
import { ExportBar } from "./ExportBar";
import { configJson } from "./exportConfig";
import { initScript } from "./initScript";
import { inspectAt } from "./inspect";
import { headline } from "./metrics";
import { Numbers } from "./Numbers";
import { pointAt, pricePath } from "./path";
import { SimulatePanel } from "./SimulatePanel";
import { startSimulation, step, type Simulation } from "./simulation";
import "./layout.css";

export function App() {
  const [probeSol, setProbeSol] = useState(1);
  const [design, setDesign] = useState<Design>(DEFAULT_DESIGN);
  const deploy = useDeployment();
  const set = (patch: Partial<Design>) => setDesign((d) => ({ ...d, ...patch }));
  const analysis = useMemo(() => analyze(design), [design]);
  const numbers = useMemo(() => (analysis.ok ? headline(design, analysis.solved, analysis.fees) : null), [analysis, design]);
  const maxThresholdSol = useMemo(() => {
    const a = analyze({ ...design, thresholdSol: null });
    return a.ok ? Number(a.solved.config.migrationQuoteThreshold) / 1e9 : null;
  }, [design]);
  const fresh = (): Simulation | null => (analysis.ok ? startSimulation(analysis.solved) : null);
  const [sim, setSim] = useState<Simulation | null>(fresh);
  // any design change invalidates the simulated pool
  useEffect(() => setSim(fresh()), [analysis]); // eslint-disable-line react-hooks/exhaustive-deps
  const buyNow = () => {
    if (!analysis.ok || !sim) return;
    setSim(step(sim, analysis.solved, analysis.fees, { kind: "buy", quote: BigInt(Math.round(probeSol * 1e9)) }));
  };

  const sellNow = (percent: bigint) => {
    if (!analysis.ok || !sim) return;
    setSim(step(sim, analysis.solved, analysis.fees, { kind: "sell", base: (sim.holding * percent) / 100n }));
  };

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
              simulated={sim?.trades.map((t) => pointAt(design, analysis.solved, t.result.sqrtPriceAfter)) ?? []}
              inspect={(sp) => inspectAt(analysis.solved, analysis.fees, sp, probeSol)}
            />
            <Numbers h={numbers!} />
          </>
        ) : (
          <div className="stage-error" role="alert">{analysis.error}</div>
        )}
      </main>
      <aside className="zone zone-side" aria-label="Simulate">
        {sim && (
          <SimulatePanel
            sim={sim}
            baseDecimals={design.baseDecimals}
            sizeSol={probeSol}
            onSize={setProbeSol}
            onBuy={buyNow}
            onSell={sellNow}
            onReset={() => setSim(fresh())}
          />
        )}
        <DeployPanel analysis={analysis} deploy={deploy} />
      </aside>
      <footer className="zone zone-export">
        <ExportBar
          json={analysis.ok ? () => configJson(design, analysis.solved, numbers!) : null}
          script={analysis.ok ? () => initScript(design, analysis.solved) : null}
        />
      </footer>
    </div>
  );
}
