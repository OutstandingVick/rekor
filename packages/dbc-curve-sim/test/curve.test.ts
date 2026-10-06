import { describe, expect, it } from "vitest";
import {
  Q64,
  Rounding,
  baseSoldAt,
  deltaBase,
  deltaQuote,
  migrationSqrtPrice,
  priceToSqrtPriceQ64,
  progressBps,
  quoteReserveAt,
  segmentReserves,
  sqrtPriceQ64ToPrice,
  validateCurve,
  type CurveConfig,
} from "../src/index.js";

// Docs worked example: sqrtStartPrice 1, curve [(2, 100), (4, 500)].
// Lifted into program units: sqrt prices ×2^64, liquidity ×2^64.
const docs: CurveConfig = {
  sqrtStartPrice: 1n * Q64,
  curve: [
    { sqrtPrice: 2n * Q64, liquidity: 100n * Q64 },
    { sqrtPrice: 4n * Q64, liquidity: 500n * Q64 },
  ],
  migrationQuoteThreshold: 600n,
};

describe("docs worked example", () => {
  it("per-segment quote is 100 / 1000", () => {
    expect(segmentReserves(docs).map((s) => s.quote)).toEqual([100n, 1000n]);
  });

  it("per-segment base is 50 / 125", () => {
    expect(segmentReserves(docs).map((s) => s.base)).toEqual([50n, 125n]);
  });

  it("migration price is 9 when the threshold lands at √P = 3", () => {
    const sp = migrationSqrtPrice(docs);
    expect(sp).toBe(3n * Q64);
    expect((sp * sp) / (Q64 * Q64)).toBe(9n);
  });

  it("reserves accumulate across segments", () => {
    expect(quoteReserveAt(docs, 3n * Q64)).toBe(600n);
    expect(baseSoldAt(docs, 3n * Q64)).toBe(50n + 500n / 6n + 1n); // 50 + 500·(1/2−1/3), rounded up
  });

  it("progress is quoteReserve / threshold", () => {
    expect(progressBps(300n, 600n)).toBe(5000n);
    expect(progressBps(900n, 600n)).toBe(10000n);
  });
});

describe("deltas", () => {
  it("round up never below round down, differ by at most 1", () => {
    const a = 123456789n * Q64, b = 987654321n * Q64, L = 10n ** 30n;
    for (const f of [deltaQuote, deltaBase]) {
      const up = f(a, b, L, Rounding.Up), down = f(a, b, L, Rounding.Down);
      expect(up - down >= 0n && up - down <= 1n).toBe(true);
    }
  });
});

describe("price conversion", () => {
  it("is exact for perfect squares", () => {
    expect(priceToSqrtPriceQ64("4", 0, 0)).toBe(2n * Q64);
  });
  it("round-trips at the display boundary", () => {
    const sp = priceToSqrtPriceQ64("0.000000028", 6, 9);
    expect(sqrtPriceQ64ToPrice(sp, 6, 9)).toBeCloseTo(0.000000028, 15);
  });
});

describe("validation", () => {
  it("accepts the docs curve", () => expect(validateCurve(docs)).toEqual([]));
  it("rejects non-increasing prices", () => {
    const bad = { ...docs, curve: [docs.curve[1], docs.curve[0]] };
    expect(validateCurve(bad).join()).toMatch(/strictly increasing/);
  });
  it("rejects a threshold the curve cannot absorb", () => {
    expect(validateCurve({ ...docs, migrationQuoteThreshold: 10_000n }).join()).toMatch(/cannot absorb/);
  });
  it("rejects more than 16 points", () => {
    const curve = Array.from({ length: 17 }, (_, i) => ({ sqrtPrice: BigInt(i + 2) * Q64, liquidity: Q64 }));
    expect(validateCurve({ ...docs, curve }).join()).toMatch(/max 16/);
  });
});
