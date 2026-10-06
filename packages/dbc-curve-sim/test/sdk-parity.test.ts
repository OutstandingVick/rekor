/**
 * The gate: this package must quote exactly what Meteora's own SDK quotes for
 * the same config. The SDK's swap math is the TypeScript port of the on-chain
 * program; devnet trades close the loop against the program itself.
 *
 * SDK version is pinned in package.json. If this test breaks after an SDK
 * bump, assume our math is wrong until proven otherwise.
 */
import BN from "bn.js";
import { describe, expect, it } from "vitest";
import * as sdk from "@meteora-ag/dynamic-bonding-curve-sdk";
import {
  Rounding,
  feeNumeratorAt,
  buy,
  costToAcquire,
  deltaBase,
  deltaQuote,
  migrationSqrtPrice,
  quoteReserveAt,
  requiredSupply,
  solveCurve,
  sell,
  type CurveConfig,
  type FeeConfig,
  type PoolState,
} from "../src/index.js";

const bn = (x: bigint) => new BN(x.toString());
const big = (x: BN) => BigInt(x.toString());

function baseParams(opts: { feeBps: number; collectFeeMode: 0 | 1; creatorPct: number }) {
  return {
    token: { tokenType: 0, tokenBaseDecimal: 6, tokenQuoteDecimal: 9, tokenAuthorityOption: 0, totalTokenSupply: 1_000_000_000, leftover: 10_000 },
    fee: {
      baseFeeParams: { baseFeeMode: 0, feeSchedulerParam: { startingFeeBps: opts.feeBps, endingFeeBps: opts.feeBps, numberOfPeriod: 0, totalDuration: 0 } },
      dynamicFeeEnabled: false,
      collectFeeMode: opts.collectFeeMode,
      creatorTradingFeePercentage: opts.creatorPct,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: { migrationOption: 1, migrationFeeOption: 0, migrationFee: { feePercentage: 0, creatorFeePercentage: 0 } },
    liquidityDistribution: { partnerPermanentLockedLiquidityPercentage: 100, partnerLiquidityPercentage: 0, creatorPermanentLockedLiquidityPercentage: 0, creatorLiquidityPercentage: 0 },
    lockedVesting: { totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
    activationType: 0,
  } as any;
}

interface Fixture {
  name: string;
  ours: CurveConfig;
  fees: FeeConfig;
  sdkConfig: any;
}

function fixture(name: string, built: any, feeOpts: { collectFeeMode: 0 | 1; creatorPct: number }): Fixture {
  const ours: CurveConfig = {
    sqrtStartPrice: big(built.sqrtStartPrice),
    curve: built.curve.map((p: any) => ({ sqrtPrice: big(p.sqrtPrice), liquidity: big(p.liquidity) })),
    migrationQuoteThreshold: big(built.migrationQuoteThreshold),
  };
  const bf = built.poolFees.baseFee;
  const fees: FeeConfig = {
    baseFee: {
      cliffFeeNumerator: big(bf.cliffFeeNumerator),
      numberOfPeriod: bf.firstFactor,
      periodFrequency: big(bf.secondFactor),
      reductionFactor: big(bf.thirdFactor),
      mode: bf.baseFeeMode === 1 ? "exponential" : "linear",
    },
    collectFeeMode: feeOpts.collectFeeMode === 0 ? "quote" : "output",
    creatorTradingFeePercentage: feeOpts.creatorPct,
  };
  // What the program stores on the config account after create_config.
  const sdkConfig = {
    ...built,
    poolFees: { baseFee: bf, dynamicFee: { initialized: 0 } },
    migrationSqrtPrice: sdk.getMigrationThresholdPrice(built.migrationQuoteThreshold, built.sqrtStartPrice, built.curve),
  };
  return { name, ours, fees, sdkConfig };
}

function sdkPool(state: PoolState, quoteReserve: bigint) {
  const poolState = {
    sqrtPrice: bn(state.sqrtPrice),
    quoteReserve: bn(quoteReserve),
    activationPoint: new BN(0),
    volatilityTracker: { volatilityAccumulator: new BN(0) },
  };
  return { ...poolState, poolState } as any;
}

const fixtures: Fixture[] = [];
for (const [feeBps, collectFeeMode, creatorPct] of [
  [25, 0, 0],
  [100, 0, 50],
  [250, 1, 30],
] as const) {
  const opts = { feeBps, collectFeeMode, creatorPct };
  fixtures.push(
    fixture(
      `16-seg weighted, ${feeBps}bps, fees on ${collectFeeMode === 0 ? "quote" : "output"}`,
      sdk.buildCurveWithLiquidityWeights({
        ...baseParams(opts),
        initialMarketCap: 30,
        migrationMarketCap: 300,
        liquidityWeights: Array.from({ length: 16 }, (_, i) => 1.2 ** i),
      }),
      opts,
    ),
    fixture(
      `2-seg buildCurve, ${feeBps}bps, fees on ${collectFeeMode === 0 ? "quote" : "output"}`,
      sdk.buildCurve({ ...baseParams(opts), percentageSupplyOnMigration: 20, migrationQuoteThreshold: 85 }),
      opts,
    ),
  );
}

describe.each(fixtures)("$name", ({ ours, fees, sdkConfig }) => {
  it("migration sqrt price matches", () => {
    expect(migrationSqrtPrice(ours)).toBe(big(sdkConfig.migrationSqrtPrice));
  });

  it("primitives match per segment, both roundings", () => {
    let lower = ours.sqrtStartPrice;
    for (const p of ours.curve) {
      for (const r of [Rounding.Up, Rounding.Down]) {
        expect(deltaQuote(lower, p.sqrtPrice, p.liquidity, r)).toBe(big(sdk.getDeltaAmountQuoteUnsigned(bn(lower), bn(p.sqrtPrice), bn(p.liquidity), r)));
        expect(deltaBase(lower, p.sqrtPrice, p.liquidity, r)).toBe(big(sdk.getDeltaAmountBaseUnsigned(bn(lower), bn(p.sqrtPrice), bn(p.liquidity), r)));
      }
      lower = p.sqrtPrice;
    }
  });

  const threshold = () => ours.migrationQuoteThreshold;
  // fractions of the migration threshold: inside segment 0, across several, just short of migration
  const buySizes = () => [1n, 1_000n, threshold() / 1000n, threshold() / 7n, threshold() / 2n, (threshold() * 99n) / 100n];

  it("buys from a fresh pool match exactly", () => {
    for (const q of buySizes()) {
      const start = { sqrtPrice: ours.sqrtStartPrice };
      const mine = buy(ours, start, q, fees);
      const theirs = sdk.swapQuote(sdkPool(start, 0n), sdkConfig, false, bn(q), 0, false, new BN(0), false);
      expect(mine.amountLeft).toBe(0n);
      expect(mine.amountOut).toBe(big(theirs.outputAmount));
      expect(mine.sqrtPriceAfter).toBe(big(theirs.nextSqrtPrice));
      expect(mine.fee.trading).toBe(big(theirs.tradingFee));
      expect(mine.fee.protocol).toBe(big(theirs.protocolFee));
    }
  });

  it("buys from a mid-curve pool match exactly", () => {
    const pre = buy(ours, { sqrtPrice: ours.sqrtStartPrice }, threshold() / 3n, fees);
    const state = { sqrtPrice: pre.sqrtPriceAfter };
    const reserve = quoteReserveAt(ours, state.sqrtPrice);
    for (const q of [1_000n, threshold() / 10n, threshold() / 2n]) {
      const mine = buy(ours, state, q, fees);
      const theirs = sdk.swapQuote(sdkPool(state, reserve), sdkConfig, false, bn(q), 0, false, new BN(0), false);
      expect(mine.amountOut).toBe(big(theirs.outputAmount));
      expect(mine.sqrtPriceAfter).toBe(big(theirs.nextSqrtPrice));
      expect(mine.fee.trading).toBe(big(theirs.tradingFee));
    }
  });

  it("buy past migration: we report leftover where the SDK refuses", () => {
    const start = { sqrtPrice: ours.sqrtStartPrice };
    const q = threshold() * 2n;
    expect(buy(ours, start, q, fees).amountLeft > 0n).toBe(true);
    expect(() => sdk.swapQuote(sdkPool(start, 0n), sdkConfig, false, bn(q), 0, false, new BN(0), false)).toThrow(/Insufficient Liquidity/);
  });

  it("sells from near migration match exactly", () => {
    const pre = buy(ours, { sqrtPrice: ours.sqrtStartPrice }, (threshold() * 95n) / 100n, fees);
    const state = { sqrtPrice: pre.sqrtPriceAfter };
    const reserve = quoteReserveAt(ours, state.sqrtPrice);
    const held = pre.fee.token === "base" ? pre.amountOut : pre.amountOut; // base tokens the buyer holds
    for (const b of [1n, 10_000n, held / 50n, held / 3n, held - 1n]) {
      const mine = sell(ours, state, b, fees);
      const theirs = sdk.swapQuote(sdkPool(state, reserve), sdkConfig, true, bn(b), 0, false, new BN(0), false);
      expect(mine.amountLeft).toBe(0n);
      expect(mine.amountOut).toBe(big(theirs.outputAmount));
      expect(mine.sqrtPriceAfter).toBe(big(theirs.nextSqrtPrice));
      expect(mine.fee.trading).toBe(big(theirs.tradingFee));
      expect(mine.fee.protocol).toBe(big(theirs.protocolFee));
    }
  });

  it("cost-to-acquire matches the SDK's exact-out quote", () => {
    if (fees.collectFeeMode !== "quote") return; // exact-out with fee on base output is a different formula; we only expose fees-on-quote
    const start = { sqrtPrice: ours.sqrtStartPrice };
    for (const out of [1_000n, 10n ** 12n, 5n * 10n ** 13n]) {
      const mine = costToAcquire(ours, start, out, fees);
      const theirs = sdk.swapQuoteExactOut(sdkPool(start, 0n), sdkConfig, false, bn(out), 0, false, new BN(0), false) as any;
      expect(mine.capped).toBe(false);
      expect(mine.quoteIn).toBe(big(theirs.includedFeeInputAmount));
      expect(mine.sqrtPriceAfter).toBe(big(theirs.nextSqrtPrice));
    }
  });
});

describe("fee scheduler", () => {
  it("exponential and linear match the SDK across periods", () => {
    for (const [cliff, reduction] of [[500_000_000n, 1000n], [500_000_000n, 437n], [99_000_000n, 9999n]]) {
      for (const period of [0, 1, 7, 50, 300]) {
        const exp = feeNumeratorAt({ cliffFeeNumerator: cliff, numberOfPeriod: 1000, periodFrequency: 1n, reductionFactor: reduction, mode: "exponential" }, BigInt(period));
        expect(exp).toBe(big(sdk.getFeeNumeratorOnExponentialFeeScheduler(bn(cliff), bn(reduction), period)));
      }
    }
    for (const period of [0, 3, 10]) {
      const lin = feeNumeratorAt({ cliffFeeNumerator: 500_000_000n, numberOfPeriod: 10, periodFrequency: 1n, reductionFactor: 45_000_000n, mode: "linear" }, BigInt(period));
      expect(lin).toBe(big(sdk.getFeeNumeratorOnLinearFeeScheduler(new BN(500_000_000), new BN(45_000_000), period)));
    }
  });
});

describe("solver + supply vs SDK", () => {
  it("requiredSupply matches the SDK's create_config minimum (DAMM v2, no fee)", () => {
    for (const f of fixtures) {
      const sdkMin = big(
        sdk.getTotalSupplyFromCurve(
          bn(f.ours.migrationQuoteThreshold),
          bn(f.ours.sqrtStartPrice),
          f.sdkConfig.curve,
          { amountPerPeriod: new BN(0), cliffUnlockAmount: new BN(0), numberOfPeriod: new BN(0) } as any,
          1,
          new BN(0),
          0,
        ),
      );
      expect(requiredSupply(f.ours).required).toBe(sdkMin);
    }
  });

  it("16-segment solve agrees with buildCurveWithLiquidityWeights", () => {
    const weights = Array.from({ length: 16 }, (_, i) => 1.2 ** i);
    const built: any = sdk.buildCurveWithLiquidityWeights({
      ...baseParams({ feeBps: 100, collectFeeMode: 0, creatorPct: 0 }),
      initialMarketCap: 30,
      migrationMarketCap: 300,
      liquidityWeights: weights,
    });
    const mine = solveCurve({
      totalSupply: 1_000_000_000n * 10n ** 6n,
      baseDecimals: 6,
      quoteDecimals: 9,
      startPrice: "0.00000003",
      graduationMarketCap: "300",
      migrationQuoteThreshold: big(built.migrationQuoteThreshold),
      weights,
    });
    const rel = (a: bigint, b: bigint) => Math.abs(Number(a - b)) / Number(b);
    expect(rel(mine.config.sqrtStartPrice, big(built.sqrtStartPrice))).toBeLessThan(1e-12);
    mine.config.curve.forEach((p, i) => {
      expect(rel(p.sqrtPrice, big(built.curve[i].sqrtPrice))).toBeLessThan(1e-9);
      expect(rel(p.liquidity, big(built.curve[i].liquidity))).toBeLessThan(1e-6);
    });
    expect(mine.errors).toEqual([]);
  });
});
