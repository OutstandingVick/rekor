import { describe, expect, it } from "vitest";
import {
  Q64,
  ZERO_FEES,
  buy,
  costToAcquire,
  feeNumeratorAt,
  initialState,
  sell,
  type CurveConfig,
  type FeeConfig,
} from "../src/index.js";

const L = 10n ** 6n * Q64;
const config: CurveConfig = {
  sqrtStartPrice: 1n * Q64,
  curve: [
    { sqrtPrice: 2n * Q64, liquidity: L },
    { sqrtPrice: 3n * Q64, liquidity: 4n * L },
    { sqrtPrice: 5n * Q64, liquidity: 2n * L },
  ],
  migrationQuoteThreshold: 9_000_000n,
};
const fees: FeeConfig = {
  baseFee: { cliffFeeNumerator: 10_000_000n, numberOfPeriod: 0, periodFrequency: 0n, reductionFactor: 0n, mode: "linear" },
  collectFeeMode: "quote",
  creatorTradingFeePercentage: 50,
};

describe("buy", () => {
  it("emits one step per segment crossed, contiguous in price", () => {
    const r = buy(config, initialState(config), 3_000_000n, ZERO_FEES);
    expect(r.steps.map((s) => s.segment)).toEqual([0, 1]);
    expect(r.steps[0].sqrtPriceEnd).toBe(r.steps[1].sqrtPriceStart);
    expect(r.steps.reduce((a, s) => a + s.amountIn, 0n)).toBe(r.amountInToCurve);
    expect(r.steps.reduce((a, s) => a + s.amountOut, 0n)).toBe(r.amountOut);
  });

  it("output is monotonic in input", () => {
    let prev = 0n;
    for (let q = 100_000n; q <= 8_000_000n; q += 100_000n) {
      const out = buy(config, initialState(config), q, fees).amountOut;
      expect(out >= prev).toBe(true);
      prev = out;
    }
  });

  it("stops at migration and reports what is left", () => {
    const r = buy(config, initialState(config), 20_000_000n, ZERO_FEES);
    expect(r.amountLeft).toBe(20_000_000n - 9_000_000n);
  });

  it("fee splits protocol 20%, rest by creator percentage", () => {
    const r = buy(config, initialState(config), 1_000_000n, fees);
    expect(r.fee.total).toBe(10_000n);
    expect(r.fee.protocol).toBe(2_000n);
    expect(r.fee.creator).toBe(4_000n);
    expect(r.fee.partner).toBe(4_000n);
  });
});

describe("round trip", () => {
  it("is never profitable, even with zero fees", () => {
    for (const q of [1n, 777n, 1_000_000n, 2_500_000n, 8_999_999n]) {
      const b = buy(config, initialState(config), q, ZERO_FEES);
      const s = sell(config, { sqrtPrice: b.sqrtPriceAfter }, b.amountOut, ZERO_FEES);
      expect(s.amountOut <= q).toBe(true);
    }
  });
});

describe("cost to acquire", () => {
  it("thin first segment raises snipe cost for the same token count", () => {
    const thin = config;
    const thick = { ...config, curve: config.curve.map((p, i) => ({ ...p, liquidity: i === 0 ? 3n * L : p.liquidity })) };
    const target = 400_000n;
    const a = costToAcquire(thin, initialState(thin), target, ZERO_FEES);
    const b = costToAcquire(thick, initialState(thick), target, ZERO_FEES);
    expect(a.quoteIn > b.quoteIn).toBe(true);
    expect(a.sqrtPriceAfter > b.sqrtPriceAfter).toBe(true);
  });

  it("buying with the quoted cost yields at least the requested base", () => {
    const c = costToAcquire(config, initialState(config), 700_000n, fees);
    const r = buy(config, initialState(config), c.quoteIn, fees);
    expect(r.amountOut >= 700_000n).toBe(true);
  });
});

describe("fee scheduler", () => {
  const sched = { cliffFeeNumerator: 500_000_000n, numberOfPeriod: 10, periodFrequency: 60n, reductionFactor: 45_000_000n, mode: "linear" as const };
  it("linear decays per period and floors at the last period", () => {
    expect(feeNumeratorAt(sched, 0n)).toBe(500_000_000n);
    expect(feeNumeratorAt(sched, 120n)).toBe(410_000_000n);
    expect(feeNumeratorAt(sched, 10_000n)).toBe(50_000_000n);
  });
  it("exponential decays geometrically", () => {
    const e = (t: bigint) => feeNumeratorAt({ ...sched, reductionFactor: 1000n, mode: "exponential" }, t);
    expect(e(60n)).toBe(450_000_000n);
    expect(e(120n) < e(60n)).toBe(true);
  });
});
