import type { Design } from "./design";
import { NumberField, Section } from "./fields";
import { sol } from "./format";

export interface ConfigPanelProps {
  design: Design;
  set: (patch: Partial<Design>) => void;
  /** most SOL the supply can back for this shape, or null if no curve fits */
  maxThresholdSol: number | null;
}

export function ConfigPanel({ design, set, maxThresholdSol }: ConfigPanelProps) {
  return (
    <>
      <header className="brand">
        <strong>rekor</strong> <span>DBC curve studio</span>
      </header>
      <Section title="Supply & quote">
        <NumberField label="Total supply" unit="tokens" value={design.supplyTokens} min={1000} max={1e12} onChange={(supplyTokens) => set({ supplyTokens })} />
        <div className="field">
          <label htmlFor="decimals">Token decimals</label>
          <select id="decimals" className="select" value={design.baseDecimals} onChange={(e) => set({ baseDecimals: Number(e.target.value) as 6 | 9 })}>
            <option value={6}>6</option>
            <option value={9}>9</option>
          </select>
        </div>
        <div className="field">
          <span>Quote</span>
          <span className="static">SOL</span>
        </div>
      </Section>
      <Section title="Graduation">
        <NumberField label="Start market cap" unit="SOL" value={design.startMcSol} min={0.000001} max={1e9} onChange={(startMcSol) => set({ startMcSol })} />
        <NumberField label="Graduation market cap" unit="SOL" value={design.graduationMcSol} min={0.000001} max={1e9} onChange={(graduationMcSol) => set({ graduationMcSol })} />
        {design.thresholdSol === null ? (
          <div className="field">
            <span>SOL raised</span>
            <span className="static">{maxThresholdSol === null ? "—" : `${sol(maxThresholdSol)} SOL`}</span>
          </div>
        ) : (
          <NumberField
            label="SOL raised"
            unit="SOL"
            value={design.thresholdSol}
            min={0.001}
            max={1e9}
            onChange={(thresholdSol) => set({ thresholdSol })}
            hint={maxThresholdSol === null ? undefined : `supply backs up to ${sol(maxThresholdSol)}`}
          />
        )}
        <label className="check">
          <input
            type="checkbox"
            checked={design.thresholdSol === null}
            onChange={(e) => set({ thresholdSol: e.target.checked ? null : Math.floor((maxThresholdSol ?? 1) * 100) / 100 })}
          />
          raise the most the supply allows
        </label>
      </Section>
    </>
  );
}
