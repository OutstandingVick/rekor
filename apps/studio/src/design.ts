import type { FeeConfig, SolveInput } from "dbc-curve-sim";

export const QUOTE_DECIMALS = 9; // SOL only — other quote mints are out of scope

/** Everything the user edits, in human units. */
export interface Design {
  supplyTokens: number;
  baseDecimals: 6 | 9;
  startMcSol: number;
  graduationMcSol: number;
  /** SOL raised at graduation; null = the most the supply allows */
  thresholdSol: number | null;
  weights: number[];
  feeBps: number;
  creatorPct: number;
}

export const DEFAULT_DESIGN: Design = {
  supplyTokens: 1_000_000_000,
  baseDecimals: 6,
  startMcSol: 30,
  graduationMcSol: 400,
  thresholdSol: 85,
  weights: [3, 2, 1.5, 1, 1],
  feeBps: 100,
  creatorPct: 50,
};

const atoms = (amount: number, decimals: number) => BigInt(Math.round(amount)) * 10n ** BigInt(decimals);

export function toSolveInput(d: Design): SolveInput {
  return {
    totalSupply: atoms(d.supplyTokens, d.baseDecimals),
    baseDecimals: d.baseDecimals,
    quoteDecimals: QUOTE_DECIMALS,
    startPrice: String(d.startMcSol / d.supplyTokens),
    graduationMarketCap: String(d.graduationMcSol),
    migrationQuoteThreshold: d.thresholdSol === null ? undefined : BigInt(Math.round(d.thresholdSol * 1e9)),
    weights: d.weights,
  };
}

export function toFees(d: Design): FeeConfig {
  return {
    baseFee: { cliffFeeNumerator: BigInt(d.feeBps) * 100_000n, numberOfPeriod: 0, periodFrequency: 0n, reductionFactor: 0n, mode: "linear" },
    collectFeeMode: "quote",
    creatorTradingFeePercentage: d.creatorPct,
  };
}
