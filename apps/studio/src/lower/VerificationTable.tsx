import type { SolveResult } from "dbc-curve-sim";
import type { Verification } from "../chain/verify";
import "./table.ts";

/** The exact integer values Rekor deploys, and — once deployed — what the program stored. */
function predictedFields(solved: SolveResult) {
  const rows = [
    { field: "sqrtStartPrice", predicted: solved.config.sqrtStartPrice.toString() },
    { field: "migrationSqrtPrice", predicted: solved.migrationSqrtPrice.toString() },
    { field: "migrationQuoteThreshold", predicted: solved.config.migrationQuoteThreshold.toString() },
  ];
  solved.config.curve.forEach((p, i) => {
    rows.push({ field: `segment ${i + 1} price`, predicted: p.sqrtPrice.toString() });
    rows.push({ field: `segment ${i + 1} liquidity`, predicted: p.liquidity.toString() });
  });
  return rows;
}

export function VerificationTable({ solved, check }: { solved: SolveResult; check: Verification | "checking" | null }) {
  const onChain = check && check !== "checking" && check.kind !== "missing" ? new Map(check.checks.map((c) => [c.field, c])) : null;
  return (
    <table className="dtable">
      <thead>
        <tr>
          <th className="l">Field</th>
          <th>Predicted (program units)</th>
          <th>On chain</th>
          <th className="l">Match</th>
        </tr>
      </thead>
      <tbody>
        {predictedFields(solved).map((r) => {
          const c = onChain?.get(r.field);
          return (
            <tr key={r.field}>
              <td className="l">{r.field}</td>
              <td>{r.predicted}</td>
              <td className={c ? "" : "dim"}>{c ? c.onChain : check === "checking" ? <span className="skeleton" aria-label="reading from chain" /> : "not deployed"}</td>
              <td className="l">{c ? (c.equal ? <span className="tag ok">exact</span> : <span className="tag bad">differs</span>) : <span className="dim">—</span>}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
