import type { Mode } from "./workflow";

const COPY: Record<Mode, { title: string; sub: string }> = {
  design: { title: "Design", sub: "Launch parameters" },
  simulate: { title: "Simulate", sub: "Local trades against the designed pool" },
  deploy: { title: "Deploy", sub: "Create this exact config on devnet" },
  verify: { title: "Verify", sub: "Predicted vs actual on chain" },
};

export function PanelHeader({ mode }: { mode: Mode }) {
  const c = COPY[mode];
  return (
    <div className="panel-head">
      <h1>{c.title}</h1>
      <p>{c.sub}</p>
    </div>
  );
}
