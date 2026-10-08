import { baseSoldAt, quoteReserveAt, segments, sqrtPriceQ64ToPrice, toUi, type SolveResult } from "dbc-curve-sim";
import { QUOTE_DECIMALS, type Design } from "./design";

export interface SegmentStat {
  index: number;
  /** tokens sold at the segment's start and end (whole tokens) */
  fromTokens: number;
  toTokens: number;
  startPrice: number;
  endPrice: number;
  /** end / start − 1 */
  priceChange: number;
  /** program-unit liquidity (Q64-scaled), as stored on chain */
  liquidity: bigint;
  /** SOL raised by the end of this segment */
  cumulativeSol: number;
  /** SOL raised within this segment */
  segmentSol: number;
  /** true for the segment where graduation happens (its end is the migration price) */
  graduates: boolean;
}

/**
 * One row per segment the curve actually trades through before graduation.
 * Every figure comes from dbc-curve-sim's own reserve functions; nothing new is modelled.
 */
export function segmentStats(design: Design, solved: SolveResult): SegmentStat[] {
  const stop = solved.migrationSqrtPrice;
  const out: SegmentStat[] = [];
  let prevSol = 0;
  for (const s of segments(solved.config)) {
    if (s.lower >= stop) break;
    const upper = s.upper < stop ? s.upper : stop;
    const tok = (sp: bigint) => toUi(baseSoldAt(solved.config, sp), design.baseDecimals);
    const px = (sp: bigint) => sqrtPriceQ64ToPrice(sp, design.baseDecimals, QUOTE_DECIMALS);
    const cumulativeSol = toUi(quoteReserveAt(solved.config, upper), QUOTE_DECIMALS);
    const startPrice = px(s.lower);
    const endPrice = px(upper);
    out.push({
      index: s.index,
      fromTokens: tok(s.lower),
      toTokens: tok(upper),
      startPrice,
      endPrice,
      priceChange: endPrice / startPrice - 1,
      liquidity: s.liquidity,
      cumulativeSol,
      segmentSol: cumulativeSol - prevSol,
      graduates: upper === stop,
    });
    prevSol = cumulativeSol;
  }
  return out;
}
