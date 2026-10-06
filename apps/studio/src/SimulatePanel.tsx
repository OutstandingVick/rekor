import { toUi } from "dbc-curve-sim";
import { QUOTE_DECIMALS } from "./design";
import { NumberField, Section } from "./fields";
import { sol, tokens } from "./format";
import type { Simulation } from "./simulation";
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
  return (
    <Section title="Simulate">
      <NumberField label="Size" unit="SOL" value={sizeSol} min={0.000001} max={1e6} onChange={onSize} />
      <div className="sim-actions">
        <button type="button" className="primary" onClick={onBuy}>Buy</button>
        <button type="button" onClick={onReset} disabled={sim.trades.length === 0}>Reset</button>
        <button type="button" onClick={() => onSell(50n)} disabled={sim.holding === 0n}>Sell half</button>
        <button type="button" onClick={() => onSell(100n)} disabled={sim.holding === 0n}>Sell all</button>
      </div>
      {sim.note && <div className="sim-note">{sim.note}</div>}
      <div className="sim-holding">
        holding <strong>{tokens(toUi(sim.holding, baseDecimals))}</strong>
        <span> · spent {sol(toUi(sim.trades.reduce((a, t) => a + (t.result.side === "buy" ? t.result.amountIn - t.result.amountLeft : 0n), 0n), QUOTE_DECIMALS))} SOL</span>
      </div>
    </Section>
  );
}
