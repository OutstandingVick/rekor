/** Compact SOL: 1,234.5 / 12.34 / 0.0412 / 0.00000003 */
export function sol(x: number): string {
  if (!Number.isFinite(x)) return "—";
  const a = Math.abs(x);
  if (a >= 1000) return x.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (a >= 1) return x.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (a === 0) return "0";
  return x.toPrecision(3).replace(/\.?0+e/, "e");
}

/** Token counts: 1.2B, 340M, 12.5K */
export function tokens(x: number): string {
  const a = Math.abs(x);
  if (a >= 1e9) return `${(x / 1e9).toFixed(a >= 1e10 ? 0 : 2)}B`;
  if (a >= 1e6) return `${(x / 1e6).toFixed(a >= 1e7 ? 0 : 1)}M`;
  if (a >= 1e3) return `${(x / 1e3).toFixed(1)}K`;
  return x.toFixed(0);
}

/** Per-token prices are tiny: always 3 significant digits. */
export function price(x: number): string {
  if (!Number.isFinite(x) || x === 0) return "0";
  return x.toPrecision(3);
}

export function pct(x: number, digits = 1): string {
  return `${(x * 100).toFixed(digits)}%`;
}
