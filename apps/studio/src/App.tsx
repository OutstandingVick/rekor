import { useEffect, useMemo, useState } from "react";
import { analyze } from "./analysis";
import { Chart } from "./Chart";
import { ChartToolbar } from "./ChartToolbar";
import { Legend } from "./Legend";
import { DEFAULT_OVERLAYS, type Overlays } from "./overlays";
import { useDeployment } from "./chain/useDeployment";
import { useLiveTrades } from "./chain/useLiveTrades";
import { ConfigPanel } from "./ConfigPanel";
import { DeployPanel } from "./DeployPanel";
import { DEFAULT_DESIGN, type Design } from "./design";
import { ExportBar } from "./ExportBar";
import { configJson } from "./exportConfig";
import { initScript } from "./initScript";
import { inspectAt } from "./inspect";
import { headline } from "./metrics";
import { MetricsStrip } from "./MetricsStrip";
import { LowerPanel, type LowerTab } from "./lower/LowerPanel";
import { SegmentsTable } from "./lower/SegmentsTable";
import { pointAt, pricePath } from "./path";
import { segmentStats } from "./segmentStats";
import { Readout } from "./Readout";
import { SimulatePanel } from "./SimulatePanel";
import { startSimulation, step, type Simulation } from "./simulation";
import { buy } from "dbc-curve-sim";
import { Header } from "./shell/Header";
import { NetworkBadge } from "./shell/NetworkBadge";
import { PanelFooter } from "./shell/PanelFooter";
import { PanelHeader } from "./shell/PanelHeader";
import { Stepper } from "./shell/Stepper";
import { WalletChip } from "./shell/WalletChip";
import type { Mode } from "./shell/workflow";
import "./layout.css";

export function App() {
  const [mode, setMode] = useState<Mode>("design");
  const [overlays, setOverlays] = useState<Overlays>(DEFAULT_OVERLAYS);
  const [lowerTab, setLowerTab] = useState<LowerTab>("segments");
  const [activeSegment, setActiveSegment] = useState<number | null>(null);
  const [probeSol, setProbeSol] = useState(1);
  const [draft, setDraft] = useState<Design>(DEFAULT_DESIGN);
  const deploy = useDeployment();
  // once deployed, everything on the page describes the on-chain curve, not later edits
  const deployed = deploy.state.kind === "deployed" ? deploy.state.deployment : null;
  const design = deployed?.design ?? draft;
  const live = useLiveTrades(deployed?.pool ?? null);
  const set = (patch: Partial<Design>) => setDraft((d) => ({ ...d, ...patch }));
  const analysis = useMemo(() => analyze(design), [design]);
  const numbers = useMemo(() => (analysis.ok ? headline(design, analysis.solved, analysis.fees) : null), [analysis, design]);
  const maxThresholdSol = useMemo(() => {
    const a = analyze({ ...design, thresholdSol: null });
    return a.ok ? Number(a.solved.config.migrationQuoteThreshold) / 1e9 : null;
  }, [design]);
  // with a live pool, "what if" questions start from where the pool actually is
  const livePrice = live.trades.at(-1)?.actualSqrtPrice;
  const fresh = (): Simulation | null => (analysis.ok ? startSimulation(analysis.solved, livePrice) : null);
  const [sim, setSim] = useState<Simulation | null>(fresh);
  // any design change invalidates the simulated pool
  useEffect(() => setSim(fresh()), [analysis, livePrice]); // eslint-disable-line react-hooks/exhaustive-deps
  const buyNow = () => {
    if (!analysis.ok || !sim) return;
    setSim(step(sim, analysis.solved, analysis.fees, { kind: "buy", quote: BigInt(Math.round(probeSol * 1e9)) }));
  };

  const sellNow = (percent: bigint) => {
    if (!analysis.ok || !sim) return;
    setSim(step(sim, analysis.solved, analysis.fees, { kind: "sell", base: (sim.holding * percent) / 100n }));
  };

  // before executing: where would a buy of the current size land from the simulated pool?
  const preview = useMemo(() => {
    if (mode !== "simulate" || !analysis.ok || !sim) return null;
    const r = buy(analysis.solved.config, { sqrtPrice: sim.sqrtPrice }, BigInt(Math.round(probeSol * 1e9)), analysis.fees);
    if (r.steps.length === 0) return null;
    return { from: pointAt(design, analysis.solved, sim.sqrtPrice), to: pointAt(design, analysis.solved, r.sqrtPriceAfter), result: r };
  }, [mode, analysis, sim, probeSol, design]);
  const stats = useMemo(() => (analysis.ok ? segmentStats(design, analysis.solved) : []), [analysis, design]);
  const path = useMemo(() => (analysis.ok ? pricePath(design, analysis.solved) : []), [analysis, design]);

  return (
    <div className="app">
      <Header>
        <Stepper mode={mode} onMode={setMode} done={{ design: analysis.ok, simulate: (sim?.trades.length ?? 0) > 0, deploy: deployed !== null, verify: live.trades.length > 0 }} />
        <span className="spacer" />
        <NetworkBadge />
        <WalletChip onOpen={() => setMode("deploy")} />
      </Header>
      <main className="zone zone-stage">
        {analysis.ok ? (
          <>
            <ChartToolbar>
              <Legend
                overlays={overlays}
                onToggle={(k) => setOverlays((o) => ({ ...o, [k]: !o[k] }))}
                counts={{ actual: live.trades.length, trades: sim?.trades.length ?? 0, segments: design.weights.length }}
              />
            </ChartToolbar>
            <Chart show={overlays} activeSegment={activeSegment} onSegment={setActiveSegment} stats={stats} preview={preview} path={path} graduationMcSol={numbers!.graduationMcSol} supplyTokens={design.supplyTokens}
              probeSol={probeSol}
              actual={analysis.ok ? live.trades.map((t) => pointAt(design, analysis.solved, t.actualSqrtPrice)) : []}
              simulated={sim?.trades.map((t) => pointAt(design, analysis.solved, t.result.sqrtPriceAfter)) ?? []}
              inspect={(sp) => inspectAt(analysis.solved, analysis.fees, sp, probeSol)}
            >
              {live.trades.length > 0 && <Readout trade={live.trades.at(-1)!} baseDecimals={design.baseDecimals} />}
            </Chart>
            <MetricsStrip h={numbers!} />
            <LowerPanel tab={lowerTab} onTab={setLowerTab} counts={{ segments: stats.length, simulation: sim?.trades.length, fills: live.trades.length }}>
              {lowerTab === "segments" && <SegmentsTable stats={stats} active={activeSegment} onActive={setActiveSegment} />}
            </LowerPanel>
          </>
        ) : (
          <div className="stage-error" role="alert">{analysis.error}</div>
        )}
      </main>
      <aside className="zone zone-side" aria-label="Workflow panel">
        <PanelHeader mode={mode} />
        {mode === "design" && (
          <>
            <fieldset className="lock" disabled={deployed !== null}>
              <ConfigPanel design={design} set={set} maxThresholdSol={maxThresholdSol} />
            </fieldset>
            {deployed && <p className="locked-note">Locked to the deployed curve. “Design a new curve” to edit again.</p>}
            <PanelFooter
              tone={analysis.ok ? "ok" : "bad"}
              status={analysis.ok ? `Curve solved · ${design.weights.length} segments · ${numbers!.thresholdSol} SOL raise` : "Design is infeasible — see the chart"}
              action={<button type="button" className="cta" disabled={!analysis.ok} onClick={() => setMode("simulate")}>Continue to Simulate</button>}
            />
          </>
        )}
        {mode === "simulate" && sim && (
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
        {(mode === "deploy" || mode === "verify") && (
        <DeployPanel
          analysis={analysis}
          onLiveTrade={live.add}
          liveTrades={live.trades}
          deploy={{
            ...deploy,
            reset: () => {
              if (deployed) setDraft(deployed.design);
              deploy.reset();
            },
          }}
        />
        )}
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
