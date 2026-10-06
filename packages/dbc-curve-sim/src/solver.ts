import { type CurveConfig, type CurvePoint, baseSoldAt, deltaBase, migrationSqrtPrice } from "./curve.js";
import { MAX_CURVE_POINT, MAX_SQRT_PRICE, MIN_SQRT_PRICE, Q128, RESOLUTION, Rounding, isqrt, mulDiv, priceToSqrtPriceQ64 } from "./q64.js";

const SWAP_BUFFER_PERCENT = 25n;
const WEIGHT_SCALE = 1_000_000_000;

// ---- supply accounting (mirrors create_config, DAMM v2 concentrated migration) ----

/** Quote that seeds the DAMM v2 pool: threshold minus the migration fee, rounded up. */
export function migrationQuoteAmount(threshold: bigint, migrationFeePercent = 0): bigint {
  return mulDiv(threshold, 100n - BigInt(migrationFeePercent), 100n, Rounding.Up);
}

/** Base that seeds the DAMM v2 pool alongside the migration quote. */
export function migrationBaseAmount(config: CurveConfig, migrationFeePercent = 0): bigint {
  const sp = migrationSqrtPrice(config);
  const quote = migrationQuoteAmount(config.migrationQuoteThreshold, migrationFeePercent);
  const liquidity = (quote << (RESOLUTION * 2n)) / (sp - MIN_SQRT_PRICE);
  return deltaBase(sp, MAX_SQRT_PRICE, liquidity, Rounding.Up);
}

export interface SupplyBreakdown {
  /** base sold along the curve up to migration */
  swap: bigint;
  /** swap + 25% buffer, capped at the curve's full capacity (program rule) */
  swapWithBuffer: bigint;
  /** base deposited into DAMM v2 at migration */
  migration: bigint;
  vesting: bigint;
  /** minimum token supply create_config accepts */
  required: bigint;
}

export function requiredSupply(config: CurveConfig, migrationFeePercent = 0, vesting = 0n): SupplyBreakdown {
  const swap = baseSoldAt(config, migrationSqrtPrice(config));
  const capacity = baseSoldAt(config, MAX_SQRT_PRICE);
  const buffered = swap + (swap * SWAP_BUFFER_PERCENT) / 100n;
  const swapWithBuffer = buffered < capacity ? buffered : capacity;
  const migration = migrationBaseAmount(config, migrationFeePercent);
  return { swap, swapWithBuffer, migration, vesting, required: swapWithBuffer + migration + vesting };
}

// ---- solver ----

export interface SolveInput {
  /** total token supply, in base atoms */
  totalSupply: bigint;
  baseDecimals: number;
  quoteDecimals: number;
  /** opening price, quote per whole base token, e.g. "0.00000003" */
  startPrice: string;
  /** market cap at graduation, in whole quote tokens, e.g. "300" */
  graduationMarketCap: string;
  /** quote atoms raised at graduation. Omit to raise the most the supply allows. */
  migrationQuoteThreshold?: bigint;
  /**
   * Relative liquidity per segment, 1–16 entries. Length sets the segment count.
   * Higher weight = deeper segment = slower price movement there. Default [1].
   */
  weights?: number[];
  /** interior sqrt-price breakpoints (weights.length − 1). Default: geometric spacing. */
  breakpoints?: bigint[];
  migrationFeePercent?: number;
  lockedVesting?: bigint;
}

export interface SolveResult {
  config: CurveConfig;
  migrationSqrtPrice: bigint;
  supply: SupplyBreakdown & { total: bigint; leftover: bigint };
  errors: string[];
}

/** floor(x^(1/n)) */
function iroot(x: bigint, n: bigint): bigint {
  if (x < 2n) return x;
  let r = 1n << (BigInt(x.toString(2).length) / n + 1n);
  for (;;) {
    const next = ((n - 1n) * r + x / r ** (n - 1n)) / n;
    if (next >= r) return r;
    r = next;
  }
}

/** sqrt price from a market cap: price = marketCap / totalSupply. */
export function sqrtPriceFromMarketCap(marketCap: string, totalSupply: bigint, quoteDecimals: number): bigint {
  const [num, den] = decimalToRational(marketCap);
  // raw price (quote atoms per base atom) = mc · 10^qd / supplyAtoms
  return isqrt((num * 10n ** BigInt(quoteDecimals) * Q128) / (den * totalSupply));
}

function decimalToRational(s: string): [bigint, bigint] {
  const m = /^(\d*)(?:\.(\d*))?$/.exec(s.trim());
  if (!m) throw new Error(`not a positive decimal: ${s}`);
  const frac = m[2] ?? "";
  return [BigInt((m[1] + frac) || "0"), 10n ** BigInt(frac.length)];
}

/** Geometric breakpoints: b_i = lo^(1−i/n) · hi^(i/n), exact ends. */
export function geometricBreakpoints(lo: bigint, hi: bigint, n: number): bigint[] {
  const N = BigInt(n);
  const out: bigint[] = [];
  for (let i = 1n; i < N; i++) out.push(iroot(lo ** (N - i) * hi ** i, N));
  return out;
}

function buildConfig(lo: bigint, uppers: bigint[], weights: bigint[], threshold: bigint): CurveConfig {
  // quote absorbed per unit of scale: Σ k_i·(b_i − b_{i−1}) / 2^128
  let perScale = 0n;
  let prev = lo;
  uppers.forEach((u, i) => {
    perScale += weights[i] * (u - prev);
    prev = u;
  });
  // L_i = threshold·2^128·k_i / perScale, rounded up once per segment so the
  // curve always absorbs the full threshold by the last breakpoint
  const curve: CurvePoint[] = uppers.map((u, i) => ({
    sqrtPrice: u,
    liquidity: mulDiv(threshold * Q128, weights[i], perScale, Rounding.Up),
  }));
  return { sqrtStartPrice: lo, curve, migrationQuoteThreshold: threshold };
}

/**
 * Derive per-segment liquidity from intent. Generalises the docs' single-segment
 * recipe to N segments: price breakpoints are fixed (geometric by default),
 * weights fix the shape, and one scale factor is solved so that the quote raised
 * between start and graduation price equals the migration threshold exactly.
 * Supply is then checked against the program's create_config rule.
 */
export function solveCurve(input: SolveInput): SolveResult {
  const errors: string[] = [];
  const weightsIn = input.weights ?? [1];
  const n = weightsIn.length;
  const feePct = input.migrationFeePercent ?? 0;
  const vesting = input.lockedVesting ?? 0n;

  if (n < 1 || n > MAX_CURVE_POINT) throw new Error(`need 1–${MAX_CURVE_POINT} weights, got ${n}`);
  if (weightsIn.some((w) => !(w > 0) || !Number.isFinite(w))) throw new Error("weights must be positive finite numbers");
  const weights = weightsIn.map((w) => BigInt(Math.round(w * WEIGHT_SCALE)) || 1n);

  const lo = priceToSqrtPriceQ64(input.startPrice, input.baseDecimals, input.quoteDecimals);
  const hi = sqrtPriceFromMarketCap(input.graduationMarketCap, input.totalSupply, input.quoteDecimals);
  if (lo < MIN_SQRT_PRICE) throw new Error("start price below the program minimum");
  if (hi >= MAX_SQRT_PRICE) throw new Error("graduation price above the program maximum");
  if (hi <= lo) throw new Error("graduation market cap must imply a price above the start price");

  const interior = input.breakpoints ?? geometricBreakpoints(lo, hi, n);
  if (interior.length !== n - 1) throw new Error(`need ${n - 1} breakpoints for ${n} segments`);
  const uppers = [...interior, hi];
  let prev = lo;
  for (const u of uppers) {
    if (u <= prev) throw new Error("breakpoints must be strictly increasing between start and graduation price");
    prev = u;
  }

  const supplyFor = (t: bigint) => {
    const cfg = buildConfig(lo, uppers, weights, t);
    return { cfg, s: requiredSupply(cfg, feePct, vesting) };
  };

  let threshold = input.migrationQuoteThreshold;
  if (threshold === undefined) {
    // required supply is linear in the threshold; solve, then step down past rounding
    const probe = 10n ** BigInt(input.quoteDecimals + 3);
    const { s } = supplyFor(probe);
    threshold = ((input.totalSupply - vesting) * probe) / (s.required - vesting);
    while (threshold > 0n && supplyFor(threshold).s.required > input.totalSupply) threshold -= threshold / 1_000_000n + 1n;
  }
  if (threshold <= 0n) throw new Error("migration threshold must be positive");

  const { cfg, s } = supplyFor(threshold);
  if (s.required > input.totalSupply) {
    errors.push(
      `curve needs ${s.required} base atoms but supply is ${input.totalSupply}: lower the threshold, raise the graduation market cap, or lower the start price`,
    );
  }
  return {
    config: cfg,
    migrationSqrtPrice: migrationSqrtPrice(cfg),
    supply: { ...s, total: input.totalSupply, leftover: input.totalSupply - s.required },
    errors,
  };
}
