export interface Predicted {
  sqrtStartPrice: string;
  migrationSqrtPrice: string;
  migrationQuoteThreshold: string;
  curve: { sqrtPrice: string; liquidity: string }[];
}

interface Numberish {
  toString(): string;
}

/** What we read off the PoolConfig account (curve is zero-padded to 20 points on chain). */
export interface OnChainConfig {
  sqrtStartPrice: Numberish;
  migrationSqrtPrice: Numberish;
  migrationQuoteThreshold: Numberish;
  curve: { sqrtPrice: Numberish; liquidity: Numberish }[];
}

export interface Mismatch {
  field: string;
  predicted: string;
  onChain: string;
}

/** Every field must match exactly; returns the list of differences (empty = match). */
export function compareConfig(predicted: Predicted, onChain: OnChainConfig): Mismatch[] {
  const out: Mismatch[] = [];
  const check = (field: string, p: string, o: Numberish) => {
    if (p !== o.toString()) out.push({ field, predicted: p, onChain: o.toString() });
  };
  check("sqrtStartPrice", predicted.sqrtStartPrice, onChain.sqrtStartPrice);
  check("migrationSqrtPrice", predicted.migrationSqrtPrice, onChain.migrationSqrtPrice);
  check("migrationQuoteThreshold", predicted.migrationQuoteThreshold, onChain.migrationQuoteThreshold);
  const live = onChain.curve.filter((p) => p.liquidity.toString() !== "0");
  if (live.length !== predicted.curve.length) {
    out.push({ field: "curve.length", predicted: String(predicted.curve.length), onChain: String(live.length) });
  }
  predicted.curve.forEach((p, i) => {
    if (!live[i]) return;
    check(`curve[${i}].sqrtPrice`, p.sqrtPrice, live[i].sqrtPrice);
    check(`curve[${i}].liquidity`, p.liquidity, live[i].liquidity);
  });
  return out;
}
