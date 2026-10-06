import { describe, expect, it } from "vitest";
import {
  Q128,
  costToAcquirePercent,
  initialState,
  quoteReserveAt,
  solveCurve,
  sqrtPriceQ64ToPrice,
  validateCurve,
  ZERO_FEES,
  type SolveInput,
} from "../src/index.js";

const SOL = 10n ** 9n;
const base: SolveInput = {
  totalSupply: 1_000_000_000n * 10n ** 6n,
  baseDecimals: 6,
  quoteDecimals: 9,
  startPrice: "0.00000003", // 30 SOL FDV
  graduationMarketCap: "300",
  migrationQuoteThreshold: 60n * SOL, // 1 flat segment caps at ~72 SOL for this supply
};

const rel = (a: bigint, b: bigint) => Math.abs(Number(a - b)) / Number(b);

describe("single segment", () => {
  it("matches the docs recipe L = z·2^128 / (√Pmax − √Pstart), rounded up", () => {
    const r = solveCurve(base);
    const { sqrtStartPrice: lo, curve } = r.config;
    const hi = curve[0].sqrtPrice;
    expect(curve[0].liquidity).toBe((base.migrationQuoteThreshold! * Q128 + (hi - lo) - 1n) / (hi - lo));
  });
});

describe.each([1, 2, 5, 16])("%i segments", (n) => {
  const weights = Array.from({ length: n }, (_, i) => 1 + i);
  const r = solveCurve({ ...base, weights });

  it("is a valid config", () => {
    expect(validateCurve(r.config)).toEqual([]);
    expect(r.errors).toEqual([]);
    expect(r.config.curve).toHaveLength(n);
  });

  it("graduates at the target market cap", () => {
    const hi = r.config.curve[n - 1].sqrtPrice;
    expect(r.migrationSqrtPrice <= hi).toBe(true);
    expect(rel(r.migrationSqrtPrice, hi)).toBeLessThan(1e-9);
    const mc = sqrtPriceQ64ToPrice(r.migrationSqrtPrice, 6, 9) * 1e9;
    expect(mc).toBeCloseTo(300, 4);
  });

  it("raises exactly the threshold by graduation", () => {
    const raised = quoteReserveAt(r.config, r.migrationSqrtPrice);
    expect(raised - base.migrationQuoteThreshold! >= 0n).toBe(true);
    expect(raised - base.migrationQuoteThreshold! <= BigInt(n)).toBe(true);
  });

  it("fits the supply, with leftover reported", () => {
    expect(r.supply.required <= base.totalSupply).toBe(true);
    expect(r.supply.leftover).toBe(base.totalSupply - r.supply.required);
  });
});

describe("fill-supply mode", () => {
  it("picks the largest threshold the supply allows", () => {
    const r = solveCurve({ ...base, migrationQuoteThreshold: undefined, weights: [1, 2, 3, 4, 5] });
    expect(r.errors).toEqual([]);
    expect(Number(r.supply.leftover) / Number(base.totalSupply)).toBeLessThan(1e-5);
    const over = solveCurve({ ...base, weights: [1, 2, 3, 4, 5], migrationQuoteThreshold: (r.config.migrationQuoteThreshold * 1001n) / 1000n });
    expect(over.errors.length).toBe(1);
  });
});

describe("infeasible intent is reported, not silently built", () => {
  it("threshold too large for supply", () => {
    const r = solveCurve({ ...base, migrationQuoteThreshold: 10_000n * SOL });
    expect(r.errors.join()).toMatch(/needs .* base atoms but supply is/);
  });
  it("graduation below start", () => {
    expect(() => solveCurve({ ...base, graduationMarketCap: "10" })).toThrow(/above the start price/);
  });
  it("17 segments", () => {
    expect(() => solveCurve({ ...base, weights: Array(17).fill(1) })).toThrow(/1–16/);
  });
});

describe("weights shape the curve", () => {
  // For a fixed token count, quote = L·x·a / (L − x·√a), decreasing in L:
  // thin early liquidity is what makes sniping the first 5% expensive.
  it("thin early liquidity makes the first 5% cost more", () => {
    const front = solveCurve({ ...base, weights: [8, 4, 2, 1] }).config;
    const back = solveCurve({ ...base, weights: [1, 2, 4, 8] }).config;
    const cost = (c: typeof front) => costToAcquirePercent(c, base.totalSupply, 500n, ZERO_FEES).quoteIn;
    expect(cost(back) > cost(front)).toBe(true);
  });
  it("a buy moves price, unlike the hand-picked day-1 config", () => {
    const c = solveCurve({ ...base, weights: [1, 1, 1, 1, 1] }).config;
    const r = costToAcquirePercent(c, base.totalSupply, 100n, ZERO_FEES);
    expect(r.sqrtPriceAfter > initialState(c).sqrtPrice).toBe(true);
  });
});
