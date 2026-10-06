import type { Design } from "./design";
import { NumberField, Section } from "./fields";

export interface ConfigPanelProps {
  design: Design;
  set: (patch: Partial<Design>) => void;
}

export function ConfigPanel({ design, set }: ConfigPanelProps) {
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
    </>
  );
}
