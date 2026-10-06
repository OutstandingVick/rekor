// Q64.64 fixed point. All curve math is bigint; floats appear only in the
// display helpers at the bottom of this file.

export const RESOLUTION = 64n;
export const Q64 = 1n << RESOLUTION;
export const Q128 = 1n << (RESOLUTION * 2n);

export const MIN_SQRT_PRICE = 4295048016n;
export const MAX_SQRT_PRICE = 79226673521066979257578248091n;
export const MAX_CURVE_POINT = 16;

export enum Rounding {
  Up = 0,
  Down = 1,
}

export function mulDiv(x: bigint, y: bigint, denominator: bigint, rounding: Rounding): bigint {
  if (denominator === 0n) throw new Error("mulDiv: division by zero");
  const prod = x * y;
  if (rounding === Rounding.Up) return (prod + denominator - 1n) / denominator;
  return prod / denominator;
}

export function isqrt(value: bigint): bigint {
  if (value < 0n) throw new Error("isqrt of negative");
  if (value < 2n) return value;
  let x = value;
  let y = (x + 1n) / 2n;
  while (y < x) {
    x = y;
    y = (x + value / x) / 2n;
  }
  return x;
}

// Parse a decimal string ("0.000000028", "1e-9", 42) into an exact rational.
function toRational(v: string | number | bigint): [bigint, bigint] {
  if (typeof v === "bigint") return [v, 1n];
  const s = typeof v === "number" ? v.toString() : v.trim();
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:e([+-]?\d+))?$/i.exec(s);
  if (!m) throw new Error(`not a decimal: ${s}`);
  const [, sign, int = "", frac = "", exp = "0"] = m;
  let num = BigInt((int + frac) || "0");
  let den = 10n ** BigInt(frac.length);
  const e = Number(exp);
  if (e >= 0) num *= 10n ** BigInt(e);
  else den *= 10n ** BigInt(-e);
  return [sign === "-" ? -num : num, den];
}

/**
 * Human price (quote per base, in whole tokens) → sqrt price Q64.64 in raw
 * atom units. Exact: floors the true value, never goes through a float.
 */
export function priceToSqrtPriceQ64(
  price: string | number,
  baseDecimals: number,
  quoteDecimals: number,
): bigint {
  let [num, den] = toRational(price);
  const shift = quoteDecimals - baseDecimals;
  if (shift >= 0) num *= 10n ** BigInt(shift);
  else den *= 10n ** BigInt(-shift);
  return isqrt((num << (RESOLUTION * 2n)) / den);
}

// ---- display boundary: floats allowed below this line ----

/** sqrt price Q64.64 (raw atoms) → human price as a float. */
export function sqrtPriceQ64ToPrice(sqrtPrice: bigint, baseDecimals: number, quoteDecimals: number): number {
  const raw = Number((sqrtPrice * sqrtPrice * 10n ** 18n) / Q128) / 1e18;
  return raw * 10 ** (baseDecimals - quoteDecimals);
}

export function toUi(amount: bigint, decimals: number): number {
  return Number(amount) / 10 ** decimals;
}
