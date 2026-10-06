import type { SolveResult } from "dbc-curve-sim";
import { QUOTE_DECIMALS, toSolveInput, type Design } from "./design";
import type { Headline } from "./metrics";

/**
 * The designed config as JSON. Curve values are exact integer strings (Q64.64
 * sqrt prices, program-unit liquidity, atoms) — never floats — so what's
 * exported is bit-for-bit what the chart predicted.
 */
export function configJson(design: Design, solved: SolveResult, h: Headline): string {
  const input = toSolveInput(design);
  const doc = {
    $schema: "rekor/dbc-config@1",
    program: "dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN",
    token: { totalSupply: input.totalSupply.toString(), decimals: design.baseDecimals },
    quote: { mint: "So11111111111111111111111111111111111111112", decimals: QUOTE_DECIMALS },
    curve: {
      sqrtStartPrice: solved.config.sqrtStartPrice.toString(),
      points: solved.config.curve.map((p) => ({ sqrtPrice: p.sqrtPrice.toString(), liquidity: p.liquidity.toString() })),
      migrationQuoteThreshold: solved.config.migrationQuoteThreshold.toString(),
    },
    fees: { tradingFeeBps: design.feeBps, creatorTradingFeePercentage: design.creatorPct, collectFeeMode: "quote" },
    migration: { target: "DAMM v2" },
    prediction: {
      migrationSqrtPrice: solved.migrationSqrtPrice.toString(),
      graduationMarketCapSol: h.graduationMcSol,
      costToSnipe5PctSol: h.snipe5Capped ? null : h.snipe5Sol,
      supply: {
        soldOnCurve: solved.supply.swap.toString(),
        depositedAtMigration: solved.supply.migration.toString(),
        leftover: solved.supply.leftover.toString(),
      },
    },
    intent: { ...design },
  };
  return JSON.stringify(doc, null, 2);
}
