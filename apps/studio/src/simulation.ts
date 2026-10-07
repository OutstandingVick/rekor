import { buy, sell, type FeeConfig, type SolveResult, type SwapResult } from "dbc-curve-sim";

export interface SimTrade {
  id: number;
  result: SwapResult;
  /** base tokens the simulated trader holds after this trade */
  holding: bigint;
}

export interface Simulation {
  sqrtPrice: bigint;
  holding: bigint;
  trades: SimTrade[];
  /** set when the last request couldn't be filled in full */
  note: string | null;
}

/** Start from the opening price, or from a live pool's current price when one exists. */
export function startSimulation(solved: SolveResult, from?: bigint): Simulation {
  return { sqrtPrice: from ?? solved.config.sqrtStartPrice, holding: 0n, trades: [], note: null };
}

export type SimAction = { kind: "buy"; quote: bigint } | { kind: "sell"; base: bigint };

/** Apply one trade with the package's own swap math. Partial fills are kept and flagged. */
export function step(sim: Simulation, solved: SolveResult, fees: FeeConfig, action: SimAction): Simulation {
  if (action.kind === "sell" && (sim.holding === 0n || action.base === 0n)) {
    return { ...sim, note: "nothing to sell — buy first" };
  }
  const state = { sqrtPrice: sim.sqrtPrice };
  const result =
    action.kind === "buy"
      ? buy(solved.config, state, action.quote, fees)
      : sell(solved.config, state, action.base > sim.holding ? sim.holding : action.base, fees);
  if (result.steps.length === 0) {
    return { ...sim, note: action.kind === "buy" ? "curve has graduated — no more buys" : "at start price — nothing to sell into" };
  }
  const holding = action.kind === "buy" ? sim.holding + result.amountOut : sim.holding - result.amountIn + result.amountLeft;
  return {
    sqrtPrice: result.sqrtPriceAfter,
    holding,
    trades: [...sim.trades, { id: sim.trades.length + 1, result, holding }],
    note: result.amountLeft > 0n ? (action.kind === "buy" ? "graduated mid-trade; unspent SOL returned" : "hit start price; rest unsold") : null,
  };
}
