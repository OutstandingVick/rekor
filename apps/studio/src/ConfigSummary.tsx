import type { Design } from "./design";
import { sol } from "./format";

/** The exact configuration a deploy will create, restated before the user signs. */
export function ConfigSummary({ design, thresholdSol }: { design: Design; thresholdSol: number }) {
  const rows: [string, string][] = [
    ["Network", "Solana devnet"],
    ["Quote", "SOL"],
    ["Supply", `${design.supplyTokens.toLocaleString("en-US")} · ${design.baseDecimals} dp`],
    ["Segments", String(design.weights.length)],
    ["Start → graduation MC", `${sol(design.startMcSol)} → ${sol(design.graduationMcSol)} SOL`],
    ["Raise target", `${sol(thresholdSol)} SOL`],
    ["Trading fee", `${design.feeBps} bps · creator ${design.creatorPct}%`],
    ["Migration", "DAMM v2"],
  ];
  return (
    <dl className="cfg-summary">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
