import {
  type CurveConfig,
  deltaBase,
  deltaQuote,
  migrationSqrtPrice,
  nextSqrtPriceFromBaseIn,
  nextSqrtPriceFromBaseOut,
  nextSqrtPriceFromQuoteIn,
  segments,
} from "./curve.js";
import { Q64, Rounding, mulDiv } from "./q64.js";

export const FEE_DENOMINATOR = 1_000_000_000n;
export const MAX_FEE_NUMERATOR = 990_000_000n;
export const PROTOCOL_FEE_PERCENT = 20n;

/** Fee scheduler only. Rate limiter is out of scope (deprecated for new configs). */
export interface BaseFee {
  cliffFeeNumerator: bigint;
  numberOfPeriod: number;
  periodFrequency: bigint;
  reductionFactor: bigint;
  mode: "linear" | "exponential";
}

export interface FeeConfig {
  baseFee: BaseFee;
  /** "quote": fees always taken in quote. "output": fees taken in the output token. */
  collectFeeMode: "quote" | "output";
  /** 0–100: creator's share of the trading fee (the rest is the partner's). */
  creatorTradingFeePercentage: number;
}

export const ZERO_FEES: FeeConfig = {
  baseFee: { cliffFeeNumerator: 0n, numberOfPeriod: 0, periodFrequency: 0n, reductionFactor: 0n, mode: "linear" },
  collectFeeMode: "quote",
  creatorTradingFeePercentage: 0,
};

function powQ64(base: bigint, exp: number): bigint {
  let result = Q64;
  let b = base;
  let e = exp;
  while (e > 0) {
    if (e & 1) result = (result * b) / Q64;
    b = (b * b) / Q64;
    e >>= 1;
  }
  return result;
}

/** Base fee numerator after `elapsed` slots/seconds since activation. */
export function feeNumeratorAt(baseFee: BaseFee, elapsed: bigint = 0n): bigint {
  const { cliffFeeNumerator, numberOfPeriod, periodFrequency, reductionFactor, mode } = baseFee;
  let fee = cliffFeeNumerator;
  if (periodFrequency !== 0n) {
    const raw = elapsed / periodFrequency;
    const period = raw < BigInt(numberOfPeriod) ? raw : BigInt(numberOfPeriod);
    if (mode === "linear") {
      fee = cliffFeeNumerator - period * reductionFactor;
    } else if (period > 0n) {
      const base = Q64 - (reductionFactor << 64n) / 10_000n;
      fee = (cliffFeeNumerator * powQ64(base, Number(period))) / Q64;
    }
  }
  return fee > MAX_FEE_NUMERATOR ? MAX_FEE_NUMERATOR : fee;
}

export interface FeeBreakdown {
  total: bigint;
  protocol: bigint;
  /** total − protocol; split between partner and creator */
  trading: bigint;
  partner: bigint;
  creator: bigint;
  token: "quote" | "base";
}

function splitFee(total: bigint, creatorPct: number, token: "quote" | "base"): FeeBreakdown {
  const protocol = (total * PROTOCOL_FEE_PERCENT) / 100n;
  const trading = total - protocol;
  const creator = (trading * BigInt(creatorPct)) / 100n;
  return { total, protocol, trading, partner: trading - creator, creator, token };
}

/** Fee on an amount that already includes it (rounds the fee up, like the program). */
function feeOnIncluded(amount: bigint, numerator: bigint): bigint {
  return mulDiv(amount, numerator, FEE_DENOMINATOR, Rounding.Up);
}

export interface SwapStep {
  segment: number;
  sqrtPriceStart: bigint;
  sqrtPriceEnd: bigint;
  amountIn: bigint;
  amountOut: bigint;
}

export interface SwapResult {
  side: "buy" | "sell";
  /** what the trader pays, fee included when the fee is on input */
  amountIn: bigint;
  /** amount that actually moved the curve */
  amountInToCurve: bigint;
  /** what the trader receives, fee excluded */
  amountOut: bigint;
  fee: FeeBreakdown;
  sqrtPriceBefore: bigint;
  sqrtPriceAfter: bigint;
  /** input the curve could not absorb (buy past migration / sell below start). 0 = fully filled */
  amountLeft: bigint;
  /** one entry per segment touched, in walk order */
  steps: SwapStep[];
  /** price move caused by the trade, in bps of the starting price */
  priceImpactBps: bigint;
}

export interface PoolState {
  sqrtPrice: bigint;
}

export function initialState(config: CurveConfig): PoolState {
  return { sqrtPrice: config.sqrtStartPrice };
}

function priceImpactBps(before: bigint, after: bigint): bigint {
  const p0 = before * before;
  const p1 = after * after;
  const d = p1 > p0 ? p1 - p0 : p0 - p1;
  return (d * 10_000n) / p0;
}

/** Walk segments upward spending quote. Mirrors the program's quote→base path. */
function walkBuy(config: CurveConfig, from: bigint, amountIn: bigint) {
  const stop = migrationSqrtPrice(config);
  const steps: SwapStep[] = [];
  let current = from;
  let left = amountIn;
  for (const s of segments(config)) {
    if (s.upper === 0n || s.liquidity === 0n) break;
    const ref = stop < s.upper ? stop : s.upper;
    if (ref <= current) continue;
    const maxIn = deltaQuote(current, ref, s.liquidity, Rounding.Up);
    if (left < maxIn) {
      const next = nextSqrtPriceFromQuoteIn(current, s.liquidity, left);
      const out = deltaBase(current, next, s.liquidity, Rounding.Down);
      steps.push({ segment: s.index, sqrtPriceStart: current, sqrtPriceEnd: next, amountIn: left, amountOut: out });
      current = next;
      left = 0n;
      break;
    }
    const out = deltaBase(current, ref, s.liquidity, Rounding.Down);
    steps.push({ segment: s.index, sqrtPriceStart: current, sqrtPriceEnd: ref, amountIn: maxIn, amountOut: out });
    current = ref;
    left -= maxIn;
    if (ref === stop) break;
  }
  return { steps, sqrtPriceAfter: current, amountLeft: left };
}

/** Walk segments downward spending base. Mirrors the program's base→quote path. */
function walkSell(config: CurveConfig, from: bigint, amountIn: bigint) {
  const segs = segments(config);
  const steps: SwapStep[] = [];
  let current = from;
  let left = amountIn;
  for (let i = segs.length - 1; i >= 0 && left > 0n; i--) {
    const s = segs[i];
    if (s.lower >= current) continue;
    const top = current < s.upper ? current : s.upper;
    const floor = s.lower;
    const maxIn = deltaBase(floor, top, s.liquidity, Rounding.Up);
    if (left < maxIn || i === 0) {
      let next = nextSqrtPriceFromBaseIn(top, s.liquidity, left);
      let used = left;
      if (next < floor) {
        next = floor;
        used = maxIn;
      }
      const out = deltaQuote(next, top, s.liquidity, Rounding.Down);
      steps.push({ segment: s.index, sqrtPriceStart: top, sqrtPriceEnd: next, amountIn: used, amountOut: out });
      current = next;
      left -= used;
      break;
    }
    const out = deltaQuote(floor, top, s.liquidity, Rounding.Down);
    steps.push({ segment: s.index, sqrtPriceStart: top, sqrtPriceEnd: floor, amountIn: maxIn, amountOut: out });
    current = floor;
    left -= maxIn;
  }
  return { steps, sqrtPriceAfter: current, amountLeft: left };
}

const sum = (steps: SwapStep[], k: "amountIn" | "amountOut") => steps.reduce((a, s) => a + s[k], 0n);

/** Spend `quoteIn` (fee included when fees are on quote) to buy base. */
export function buy(config: CurveConfig, state: PoolState, quoteIn: bigint, fees: FeeConfig, elapsed = 0n): SwapResult {
  const numerator = feeNumeratorAt(fees.baseFee, elapsed);
  const feeOnInput = fees.collectFeeMode === "quote";
  const inFee = feeOnInput ? feeOnIncluded(quoteIn, numerator) : 0n;
  const toCurve = quoteIn - inFee;
  const walk = walkBuy(config, state.sqrtPrice, toCurve);
  const gross = sum(walk.steps, "amountOut");
  const outFee = feeOnInput ? 0n : feeOnIncluded(gross, numerator);
  return {
    side: "buy",
    amountIn: quoteIn,
    amountInToCurve: toCurve,
    amountOut: gross - outFee,
    fee: splitFee(inFee + outFee, fees.creatorTradingFeePercentage, feeOnInput ? "quote" : "base"),
    sqrtPriceBefore: state.sqrtPrice,
    sqrtPriceAfter: walk.sqrtPriceAfter,
    amountLeft: walk.amountLeft,
    steps: walk.steps,
    priceImpactBps: priceImpactBps(state.sqrtPrice, walk.sqrtPriceAfter),
  };
}

/** Sell `baseIn` for quote. Fees are always taken from the quote output. */
export function sell(config: CurveConfig, state: PoolState, baseIn: bigint, fees: FeeConfig, elapsed = 0n): SwapResult {
  const numerator = feeNumeratorAt(fees.baseFee, elapsed);
  const walk = walkSell(config, state.sqrtPrice, baseIn);
  const gross = sum(walk.steps, "amountOut");
  const fee = feeOnIncluded(gross, numerator);
  return {
    side: "sell",
    amountIn: baseIn,
    amountInToCurve: baseIn,
    amountOut: gross - fee,
    fee: splitFee(fee, fees.creatorTradingFeePercentage, "quote"),
    sqrtPriceBefore: state.sqrtPrice,
    sqrtPriceAfter: walk.sqrtPriceAfter,
    amountLeft: walk.amountLeft,
    steps: walk.steps,
    priceImpactBps: priceImpactBps(state.sqrtPrice, walk.sqrtPriceAfter),
  };
}

export interface AcquireCost {
  /** quote the buyer pays, fee included */
  quoteIn: bigint;
  /** base actually obtainable (capped at what the curve sells before migration) */
  baseOut: bigint;
  sqrtPriceAfter: bigint;
  steps: SwapStep[];
  /** true if the curve migrates before `baseOut` reaches the request */
  capped: boolean;
}

/** Quote needed to buy exactly `baseOut` from `state` (fees on quote). */
export function costToAcquire(config: CurveConfig, state: PoolState, baseOut: bigint, fees: FeeConfig, elapsed = 0n): AcquireCost {
  const stop = migrationSqrtPrice(config);
  const steps: SwapStep[] = [];
  let current = state.sqrtPrice;
  let left = baseOut;
  for (const s of segments(config)) {
    if (left === 0n) break;
    const ref = stop < s.upper ? stop : s.upper;
    if (ref <= current) continue;
    const maxOut = deltaBase(current, ref, s.liquidity, Rounding.Down);
    if (left < maxOut) {
      const next = nextSqrtPriceFromBaseOut(current, s.liquidity, left);
      const quote = deltaQuote(current, next, s.liquidity, Rounding.Up);
      steps.push({ segment: s.index, sqrtPriceStart: current, sqrtPriceEnd: next, amountIn: quote, amountOut: left });
      current = next;
      left = 0n;
      break;
    }
    const quote = deltaQuote(current, ref, s.liquidity, Rounding.Up);
    steps.push({ segment: s.index, sqrtPriceStart: current, sqrtPriceEnd: ref, amountIn: quote, amountOut: maxOut });
    current = ref;
    left -= maxOut;
    if (ref === stop) break;
  }
  const net = sum(steps, "amountIn");
  const numerator = feeNumeratorAt(fees.baseFee, elapsed);
  const quoteIn = mulDiv(net, FEE_DENOMINATOR, FEE_DENOMINATOR - numerator, Rounding.Up);
  return { quoteIn, baseOut: baseOut - left, sqrtPriceAfter: current, steps, capped: left > 0n };
}

/** Cost to snipe the first `bps` of total supply from a fresh pool. */
export function costToAcquirePercent(config: CurveConfig, totalSupply: bigint, bps: bigint, fees: FeeConfig): AcquireCost {
  return costToAcquire(config, initialState(config), (totalSupply * bps) / 10_000n, fees);
}
