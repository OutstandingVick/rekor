import { baseSoldAt, segments, sqrtPriceQ64ToPrice, toUi, type SolveResult } from "dbc-curve-sim";
import { QUOTE_DECIMALS, type Design } from "./design";

export interface PathPoint {
  segment: number;
  sqrtPrice: bigint;
  /** whole tokens sold so far */
  tokens: number;
  /** SOL per token */
  price: number;
}

const SAMPLES_PER_SEGMENT = 48;

/** Price vs tokens sold, from start to graduation, sampled per segment so each can be shaded. */
export function pricePath(design: Design, solved: SolveResult): PathPoint[][] {
  const stop = solved.migrationSqrtPrice;
  const out: PathPoint[][] = [];
  for (const s of segments(solved.config)) {
    if (s.lower >= stop) break;
    const upper = s.upper < stop ? s.upper : stop;
    const pts: PathPoint[] = [];
    for (let i = 0; i <= SAMPLES_PER_SEGMENT; i++) {
      const sp = s.lower + ((upper - s.lower) * BigInt(i)) / BigInt(SAMPLES_PER_SEGMENT);
      pts.push({
        segment: s.index,
        sqrtPrice: sp,
        tokens: toUi(baseSoldAt(solved.config, sp), design.baseDecimals),
        price: sqrtPriceQ64ToPrice(sp, design.baseDecimals, QUOTE_DECIMALS),
      });
    }
    out.push(pts);
  }
  return out;
}

/** Where a given pool price sits on the chart. */
export function pointAt(design: Design, solved: SolveResult, sqrtPrice: bigint, segment = -1): PathPoint {
  return {
    segment,
    sqrtPrice,
    tokens: toUi(baseSoldAt(solved.config, sqrtPrice), design.baseDecimals),
    price: sqrtPriceQ64ToPrice(sqrtPrice, design.baseDecimals, QUOTE_DECIMALS),
  };
}
