import { toUi } from "dbc-curve-sim";
import { QUOTE_DECIMALS } from "./design";
import { useState } from "react";
import { NumberField, Section } from "./fields";
import { sol, tokens } from "./format";
import type { Simulation } from "./simulation";
import { TradeLog } from "./TradeLog";
import "./simulate.css";

export interface SimulatePanelProps {
  sim: Simulation;
  baseDecimals: number;
  sizeSol: number;
  onSize: (sol: number) => void;
  onBuy: () => void;
  onSell: (fraction: bigint) => void;
  onReset: () => void;
}

export function SimulatePanel({ sim, baseDecimals, sizeSol, onSize, onBuy, onSell, onReset }: SimulatePanelProps) {
  const [side, setSide] = useState<"buy" | "sell">("buy");
  return (
    <Section title="Simulate">
      <div className="side-switch" role="tablist" aria-label="Trade side">
        <button type="button" role="tab" aria-selected={side === "buy"} className={`buy ${side === "buy" ? "on" : ""}`} onClick={() => setSide("buy")}>Buy</button>
        <button type="button" role="tab" aria-selected={side === "sell"} className={`sell ${side === "sell" ? "on" : ""}`} onClick={() => setSide("sell")}>Sell</button>
      </div>
      {side === "buy" ? (
        <>
          <NumberField label="Size" unit="SOL" value={sizeSol} min={0.000001} max={1e6} onChange={onSize} />
          <div className="quick" role="group" aria-label="Quick sizes">
            {[0.1, 0.5, 1, 5].map((v) => (
              <button key={v} type="button" className={sizeSol === v ? "on" : ""} onClick={() => onSize(v)}>{v} SOL</button>
            ))}
          </div>
          <button type="button" className="exec buy" onClick={onBuy}>Buy {sizeSol} SOL</button>
        </>
      ) : (
        <div className="sim-actions">
          <button type="button" className="exec sell" onClick={() => onSell(50n)} disabled={sim.holding === 0n}>Sell half</button>
          <button type="button" className="exec sell" onClick={() => onSell(100n)} disabled={sim.holding === 0n}>Sell all</button>
        </div>
      )}
      <button type="button" className="text-btn" onClick={onReset} disabled={sim.trades.length === 0}>Reset simulation</button>
      {sim.note && <div className="sim-note">{sim.note}</div>}
      <div className="sim-holding">
        holding <strong>{tokens(toUi(sim.holding, baseDecimals))}</strong>
        <span> · spent {sol(toUi(sim.trades.reduce((a, t) => a + (t.result.side === "buy" ? t.result.amountIn - t.result.amountLeft : 0n), 0n), QUOTE_DECIMALS))} SOL</span>
      </div>
      <TradeLog trades={sim.trades} baseDecimals={baseDecimals} />
    </Section>
  );
}
