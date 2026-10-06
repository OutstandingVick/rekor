import { MAX_CURVE_POINT, MAX_SQRT_PRICE, MIN_SQRT_PRICE, Q128, RESOLUTION, Rounding, mulDiv } from "./q64.js";

/**
 * On-chain layout: segment i spans [curve[i-1].sqrtPrice, curve[i].sqrtPrice]
 * (segment 0 starts at sqrtStartPrice) with liquidity curve[i].liquidity.
 * Liquidity is in the program's units, i.e. already scaled by 2^64.
 */
export interface CurvePoint {
  sqrtPrice: bigint;
  liquidity: bigint;
}

export interface CurveConfig {
  sqrtStartPrice: bigint;
  curve: CurvePoint[];
  migrationQuoteThreshold: bigint;
}

export interface Segment {
  index: number;
  lower: bigint;
  upper: bigint;
  liquidity: bigint;
}

export function segments(config: Pick<CurveConfig, "sqrtStartPrice" | "curve">): Segment[] {
  return config.curve.map((p, i) => ({
    index: i,
    lower: i === 0 ? config.sqrtStartPrice : config.curve[i - 1].sqrtPrice,
    upper: p.sqrtPrice,
    liquidity: p.liquidity,
  }));
}

// Δquote = L·(√Pb − √Pa) / 2^128
export function deltaQuote(lower: bigint, upper: bigint, liquidity: bigint, rounding: Rounding): bigint {
  const prod = liquidity * (upper - lower);
  return rounding === Rounding.Up ? (prod + Q128 - 1n) / Q128 : prod >> (RESOLUTION * 2n);
}

// Δbase = L·(√Pb − √Pa) / (√Pa·√Pb)
export function deltaBase(lower: bigint, upper: bigint, liquidity: bigint, rounding: Rounding): bigint {
  const denominator = lower * upper;
  if (denominator === 0n) throw new Error("deltaBase: zero sqrt price");
  return mulDiv(liquidity, upper - lower, denominator, rounding);
}

// √P_next = √P + Δquote·2^128 / L   (quote in, price rises; rounds down)
export function nextSqrtPriceFromQuoteIn(sqrtPrice: bigint, liquidity: bigint, amount: bigint): bigint {
  return sqrtPrice + (amount << (RESOLUTION * 2n)) / liquidity;
}

// √P_next = L·√P / (L + Δbase·√P)   (base in, price falls; rounds up)
export function nextSqrtPriceFromBaseIn(sqrtPrice: bigint, liquidity: bigint, amount: bigint): bigint {
  if (amount === 0n) return sqrtPrice;
  const product = amount * sqrtPrice;
  if (product > (1n << 128n) - 1n) {
    // program's overflow branch: L / (L/√P + Δbase)
    return liquidity / (liquidity / sqrtPrice + amount);
  }
  return mulDiv(liquidity, sqrtPrice, liquidity + product, Rounding.Up);
}

// √P_next = L·√P / (L − Δbase·√P)   (base out, price rises; rounds up)
export function nextSqrtPriceFromBaseOut(sqrtPrice: bigint, liquidity: bigint, amount: bigint): bigint {
  if (amount === 0n) return sqrtPrice;
  const denominator = liquidity - amount * sqrtPrice;
  if (denominator <= 0n) throw new Error("base out exceeds segment liquidity");
  return mulDiv(liquidity, sqrtPrice, denominator, Rounding.Up);
}

/** Sqrt price at which the quote reserve reaches the migration threshold. */
export function migrationSqrtPrice(config: CurveConfig): bigint {
  let amountLeft = config.migrationQuoteThreshold;
  for (const s of segments(config)) {
    const max = deltaQuote(s.lower, s.upper, s.liquidity, Rounding.Up);
    // program: strict gt on first segment and later ones alike
    if (max > amountLeft) return nextSqrtPriceFromQuoteIn(s.lower, s.liquidity, amountLeft);
    amountLeft -= max;
    if (amountLeft === 0n) return s.upper;
  }
  throw new Error(`curve cannot absorb migration threshold: ${amountLeft} quote left over`);
}

/** Quote reserve the pool holds once price has reached `sqrtPrice`. */
export function quoteReserveAt(config: Pick<CurveConfig, "sqrtStartPrice" | "curve">, sqrtPrice: bigint): bigint {
  let total = 0n;
  for (const s of segments(config)) {
    if (sqrtPrice <= s.lower) break;
    const upper = sqrtPrice < s.upper ? sqrtPrice : s.upper;
    total += deltaQuote(s.lower, upper, s.liquidity, Rounding.Up);
  }
  return total;
}

/** Base tokens sold by the time price reaches `sqrtPrice`. */
export function baseSoldAt(config: Pick<CurveConfig, "sqrtStartPrice" | "curve">, sqrtPrice: bigint): bigint {
  let total = 0n;
  for (const s of segments(config)) {
    if (sqrtPrice <= s.lower) break;
    const upper = sqrtPrice < s.upper ? sqrtPrice : s.upper;
    total += deltaBase(s.lower, upper, s.liquidity, Rounding.Up);
  }
  return total;
}

/** Base tokens the curve must hold to fill every buy up to migration. */
export function baseForSwap(config: CurveConfig): bigint {
  return baseSoldAt(config, migrationSqrtPrice(config));
}

export interface SegmentReserves {
  index: number;
  quote: bigint;
  base: bigint;
}

/** Full-range quote and base per segment (for depth display). */
export function segmentReserves(config: Pick<CurveConfig, "sqrtStartPrice" | "curve">): SegmentReserves[] {
  return segments(config).map((s) => ({
    index: s.index,
    quote: deltaQuote(s.lower, s.upper, s.liquidity, Rounding.Up),
    base: deltaBase(s.lower, s.upper, s.liquidity, Rounding.Up),
  }));
}

/** progress = quoteReserve / migrationQuoteThreshold, in basis points. */
export function progressBps(quoteReserve: bigint, migrationQuoteThreshold: bigint): bigint {
  if (migrationQuoteThreshold === 0n) return 0n;
  const bps = (quoteReserve * 10_000n) / migrationQuoteThreshold;
  return bps > 10_000n ? 10_000n : bps;
}

export function validateCurve(config: CurveConfig): string[] {
  const errors: string[] = [];
  const { sqrtStartPrice, curve } = config;
  if (curve.length === 0) errors.push("curve is empty");
  if (curve.length > MAX_CURVE_POINT) errors.push(`curve has ${curve.length} points, max ${MAX_CURVE_POINT}`);
  if (sqrtStartPrice < MIN_SQRT_PRICE || sqrtStartPrice >= MAX_SQRT_PRICE) errors.push("sqrtStartPrice out of range");
  let prev = sqrtStartPrice;
  curve.forEach((p, i) => {
    if (p.sqrtPrice <= prev) errors.push(`point ${i}: sqrtPrice must be strictly increasing`);
    if (p.sqrtPrice > MAX_SQRT_PRICE) errors.push(`point ${i}: sqrtPrice above MAX_SQRT_PRICE`);
    if (p.liquidity <= 0n) errors.push(`point ${i}: liquidity must be positive`);
    prev = p.sqrtPrice;
  });
  if (config.migrationQuoteThreshold <= 0n) errors.push("migrationQuoteThreshold must be positive");
  if (errors.length === 0) {
    try {
      migrationSqrtPrice(config);
    } catch (e) {
      errors.push((e as Error).message);
    }
  }
  return errors;
}
