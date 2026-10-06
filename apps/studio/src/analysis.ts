import { solveCurve, type FeeConfig, type SolveResult } from "dbc-curve-sim";
import { toFees, toSolveInput, type Design } from "./design";

export type Analysis =
  | { ok: true; design: Design; solved: SolveResult; fees: FeeConfig }
  | { ok: false; design: Design; error: string };

/** Solve a design. Never throws: bad intent comes back as a readable error. */
export function analyze(design: Design): Analysis {
  try {
    const solved = solveCurve(toSolveInput(design));
    if (solved.errors.length) return { ok: false, design, error: explainShortfall(design, solved) };
    return { ok: true, design, solved, fees: toFees(design) };
  } catch (e) {
    return { ok: false, design, error: (e as Error).message };
  }
}

/** Turn the solver's atom-level shortfall into something a launch designer can act on. */
function explainShortfall(design: Design, solved: SolveResult): string {
  const unit = 10 ** design.baseDecimals;
  const needed = Number(solved.supply.required) / unit;
  const over = needed / design.supplyTokens - 1;
  let max: number | null = null;
  try {
    max = Number(solveCurve(toSolveInput({ ...design, thresholdSol: null })).config.migrationQuoteThreshold) / 1e9;
  } catch {
    // no curve fits at all; the shortfall alone is the message
  }
  const ask = design.thresholdSol ?? 0;
  return (
    `Raising ${ask} SOL with this shape needs ${Math.round(over * 100)}% more tokens than the supply has. ` +
    (max !== null ? `It can back at most ${max.toFixed(2)} SOL — lower the SOL raised, ` : "Lower the SOL raised, ") +
    `raise the graduation market cap, or lower the start market cap.`
  );
}
