import { buy, quoteReserveAt, toUi, type FeeConfig, type SolveResult } from "dbc-curve-sim";
import { QUOTE_DECIMALS } from "./design";

export interface Inspection {
  raisedSol: number;
  /** price move from buying `sizeSol` starting here, as a fraction */
  impact: number;
  /** true when that buy would hit graduation */
  graduates: boolean;
}

export function inspectAt(solved: SolveResult, fees: FeeConfig, sqrtPrice: bigint, sizeSol: number): Inspection {
  const size = BigInt(Math.round(sizeSol * 10 ** QUOTE_DECIMALS));
  const r = buy(solved.config, { sqrtPrice }, size, fees);
  return {
    raisedSol: toUi(quoteReserveAt(solved.config, sqrtPrice), QUOTE_DECIMALS),
    impact: Number(r.priceImpactBps) / 10_000,
    graduates: r.amountLeft > 0n,
  };
}
