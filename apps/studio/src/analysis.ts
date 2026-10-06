import { solveCurve, type FeeConfig, type SolveResult } from "dbc-curve-sim";
import { toFees, toSolveInput, type Design } from "./design";

export type Analysis =
  | { ok: true; design: Design; solved: SolveResult; fees: FeeConfig }
  | { ok: false; design: Design; error: string };

/** Solve a design. Never throws: bad intent comes back as a readable error. */
export function analyze(design: Design): Analysis {
  try {
    const solved = solveCurve(toSolveInput(design));
    if (solved.errors.length) return { ok: false, design, error: solved.errors.join("; ") };
    return { ok: true, design, solved, fees: toFees(design) };
  } catch (e) {
    return { ok: false, design, error: (e as Error).message };
  }
}
