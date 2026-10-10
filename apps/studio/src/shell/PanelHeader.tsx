import { MODES, type Mode } from "./workflow";

const COPY: Record<Mode, { title: string; sub: string }> = {
  design: { title: "Design", sub: "Launch parameters" },
  simulate: { title: "Simulate", sub: "Local trades against the designed pool" },
  deploy: { title: "Deploy", sub: "Create this exact config on devnet" },
  verify: { title: "Verify", sub: "Predicted vs actual on chain" },
};

export function PanelHeader({ mode, onBack }: { mode: Mode; onBack?: (m: Mode) => void }) {
  const c = COPY[mode];
  const i = MODES.findIndex((m) => m.id === mode);
  const prev = i > 0 ? MODES[i - 1] : null;
  return (
    <div className="panel-head">
      {prev && onBack && (
        <button type="button" className="panel-back" onClick={() => onBack(prev.id)}>
          ← Back to {prev.label}
        </button>
      )}
      <h1>{c.title}</h1>
      <p>{c.sub}</p>
    </div>
  );
}
