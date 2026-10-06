import * as sdk from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";
import { describe, expect, it } from "vitest";
import { buy, initialState } from "dbc-curve-sim";
import { SPIKE_FEES, spike } from "../src/params.js";

const big = (x: BN) => BigInt(x.toString());

describe("spike config", () => {
  const { solved, params } = spike();

  it("passes the SDK's create_config validation", () => {
    expect(() => sdk.validateConfigParameters({ ...params, leftoverReceiver: sdk.DYNAMIC_BONDING_CURVE_PROGRAM_ID } as any)).not.toThrow();
  });

  it("carries the solver's curve verbatim", () => {
    expect(big(params.sqrtStartPrice)).toBe(solved.config.sqrtStartPrice);
    expect(big(params.migrationQuoteThreshold)).toBe(solved.config.migrationQuoteThreshold);
    params.curve.forEach((p, i) => {
      expect(big(p.sqrtPrice)).toBe(solved.config.curve[i].sqrtPrice);
      expect(big(p.liquidity)).toBe(solved.config.curve[i].liquidity);
    });
  });

  it("SDK quotes the deployed params exactly as we predict", () => {
    const configState = {
      ...params,
      poolFees: { baseFee: params.poolFees.baseFee, dynamicFee: { initialized: 0 } },
      migrationSqrtPrice: new BN(solved.migrationSqrtPrice.toString()),
    };
    const poolState = { sqrtPrice: params.sqrtStartPrice, quoteReserve: new BN(0), activationPoint: new BN(0), volatilityTracker: { volatilityAccumulator: new BN(0) } };
    const amount = 50_000_000n;
    const theirs = sdk.swapQuote({ ...poolState, poolState } as any, configState as any, false, new BN(amount.toString()), 0, false, new BN(0), false);
    const mine = buy(solved.config, initialState(solved.config), amount, SPIKE_FEES);
    expect(mine.amountOut).toBe(big(theirs.outputAmount));
  });
});
