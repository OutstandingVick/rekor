import BN from "bn.js";
import { describe, expect, it } from "vitest";
import { compareConfig, type Predicted } from "../src/compare.js";
import { spike } from "../src/params.js";

const { solved, params } = spike();
const predicted: Predicted = {
  sqrtStartPrice: solved.config.sqrtStartPrice.toString(),
  migrationSqrtPrice: solved.migrationSqrtPrice.toString(),
  migrationQuoteThreshold: solved.config.migrationQuoteThreshold.toString(),
  curve: solved.config.curve.map((p) => ({ sqrtPrice: p.sqrtPrice.toString(), liquidity: p.liquidity.toString() })),
};
// Shaped like the PoolConfig account: BN fields, curve zero-padded to 20 points.
const pad = Array.from({ length: 20 - params.curve.length }, () => ({ sqrtPrice: new BN(0), liquidity: new BN(0) }));
const onChain = {
  sqrtStartPrice: params.sqrtStartPrice,
  migrationSqrtPrice: new BN(solved.migrationSqrtPrice.toString()),
  migrationQuoteThreshold: params.migrationQuoteThreshold,
  curve: [...params.curve, ...pad],
};

describe("compareConfig", () => {
  it("an exact deployment has no mismatches", () => {
    expect(compareConfig(predicted, onChain)).toEqual([]);
  });
  it("catches a one-unit liquidity difference", () => {
    const curve = onChain.curve.map((p, i) => (i === 2 ? { ...p, liquidity: p.liquidity.addn(1) } : p));
    expect(compareConfig(predicted, { ...onChain, curve }).map((m) => m.field)).toEqual(["curve[2].liquidity"]);
  });
  it("catches a dropped segment", () => {
    const curve = onChain.curve.map((p, i) => (i === 4 ? { sqrtPrice: new BN(0), liquidity: new BN(0) } : p));
    expect(compareConfig(predicted, { ...onChain, curve }).map((m) => m.field)).toContain("curve.length");
  });
});
