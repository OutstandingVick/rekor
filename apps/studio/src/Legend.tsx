import type { Overlays } from "./overlays";

const ITEMS: { key: keyof Overlays; label: string; swatch: string }[] = [
  { key: "actual", label: "Actual", swatch: "actual" },
  { key: "trades", label: "Trades", swatch: "trades" },
  { key: "segments", label: "Segments", swatch: "segments" },
  { key: "graduation", label: "Graduation", swatch: "graduation" },
  { key: "snipe", label: "First 5%", swatch: "snipe" },
];

export function Legend({ overlays, onToggle, counts }: { overlays: Overlays; onToggle: (k: keyof Overlays) => void; counts: Partial<Record<keyof Overlays, number>> }) {
  return (
    <div className="legend" role="group" aria-label="Chart overlays">
      <span className="legend-item fixed" title="The designed curve is always shown">
        <i className="sw predicted" /> Predicted
      </span>
      {ITEMS.map((it) => (
        <button key={it.key} type="button" className={`legend-item ${overlays[it.key] ? "on" : ""}`} aria-pressed={overlays[it.key]} onClick={() => onToggle(it.key)}>
          <i className={`sw ${it.swatch}`} /> {it.label}
          {counts[it.key] !== undefined && <span className="cnt">{counts[it.key]}</span>}
        </button>
      ))}
    </div>
  );
}
