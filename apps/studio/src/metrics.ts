import { FEE_DENOMINATOR, PROTOCOL_FEE_PERCENT, costToAcquirePercent, feeNumeratorAt, sqrtPriceQ64ToPrice, toUi, type FeeConfig, type SolveResult } from "dbc-curve-sim";
import { QUOTE_DECIMALS, type Design } from "./design";

export interface Headline {
  graduationMcSol: number;
  /** SOL per token at graduation (the migration price) */
  graduationPrice: number;
  /** quote to buy the first 1% of supply, fee included */
  acquire1Sol: number;
  acquire1Capped: boolean;
  snipe5Sol: number;
  /** true when 5% of supply can't be bought before graduation */
  snipe5Capped: boolean;
  creatorFeesSol: number;
  partnerFeesSol: number;
  thresholdSol: number;
}

/**
 * The four numbers under the chart. Fees at graduation assume the curve is
 * filled by buys alone (no sells), which is the minimum volume that graduates it.
 */
export function headline(design: Design, solved: SolveResult, fees: FeeConfig): Headline {
  const price = sqrtPriceQ64ToPrice(solved.migrationSqrtPrice, design.baseDecimals, QUOTE_DECIMALS);
  const snipe = costToAcquirePercent(solved.config, solved.supply.total, 500n, fees);
  const one = costToAcquirePercent(solved.config, solved.supply.total, 100n, fees);

  const threshold = solved.config.migrationQuoteThreshold;
  const num = feeNumeratorAt(fees.baseFee);
  const gross = (threshold * FEE_DENOMINATOR + (FEE_DENOMINATOR - num) - 1n) / (FEE_DENOMINATOR - num);
  const fee = gross - threshold;
  const trading = fee - (fee * PROTOCOL_FEE_PERCENT) / 100n;
  const creator = (trading * BigInt(fees.creatorTradingFeePercentage)) / 100n;

  return {
    graduationMcSol: price * design.supplyTokens,
    graduationPrice: price,
    acquire1Sol: toUi(one.quoteIn, QUOTE_DECIMALS),
    acquire1Capped: one.capped,
    snipe5Sol: toUi(snipe.quoteIn, QUOTE_DECIMALS),
    snipe5Capped: snipe.capped,
    creatorFeesSol: toUi(creator, QUOTE_DECIMALS),
    partnerFeesSol: toUi(trading - creator, QUOTE_DECIMALS),
    thresholdSol: toUi(threshold, QUOTE_DECIMALS),
  };
}
