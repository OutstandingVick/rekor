import { sqrtPriceQ64ToPrice, toUi } from "dbc-curve-sim";
import type { LiveTrade } from "./chain/trade";
import { QUOTE_DECIMALS } from "./design";
import { price, sol, tokens } from "./format";

export interface CompareRow {
  metric: string;
  predicted: string;
  actual: string;
  delta: string;
  exact: boolean;
}

/**
 * Rows for one fill. Only what was measured on chain: the token balance delta and
 * the pool's post-trade sqrt price (market cap follows from that price × supply).
 */
export function compareRows(t: LiveTrade, baseDecimals: number, supplyTokens: number): CompareRow[] {
  const px = (sp: bigint) => sqrtPriceQ64ToPrice(sp, baseDecimals, QUOTE_DECIMALS);
  const tokDelta = t.actualOut - t.predictedOut;
  const spDelta = t.actualSqrtPrice - t.predictedSqrtPrice;
  const pctOf = (d: bigint, base: bigint) => (base === 0n ? 0 : (Number(d) / Number(base)) * 100);
  return [
    {
      metric: "Tokens received",
      predicted: tokens(toUi(t.predictedOut, baseDecimals)),
      actual: tokens(toUi(t.actualOut, baseDecimals)),
      delta: `${tokDelta === 0n ? "0" : toUi(tokDelta, baseDecimals).toLocaleString("en-US")} (${pctOf(tokDelta, t.predictedOut).toFixed(4)}%)`,
      exact: tokDelta === 0n,
    },
    {
      metric: "Token atoms",
      predicted: t.predictedOut.toString(),
      actual: t.actualOut.toString(),
      delta: tokDelta.toString(),
      exact: tokDelta === 0n,
    },
    {
      metric: "Price after",
      predicted: `${price(px(t.predictedSqrtPrice))} SOL`,
      actual: `${price(px(t.actualSqrtPrice))} SOL`,
      delta: `${pctOf(spDelta, t.predictedSqrtPrice).toFixed(4)}%`,
      exact: spDelta === 0n,
    },
    {
      metric: "Market cap after",
      predicted: `${sol(px(t.predictedSqrtPrice) * supplyTokens)} SOL`,
      actual: `${sol(px(t.actualSqrtPrice) * supplyTokens)} SOL`,
      delta: spDelta === 0n ? "0" : "see price",
      exact: spDelta === 0n,
    },
    {
      metric: "√P after (Q64.64)",
      predicted: t.predictedSqrtPrice.toString(),
      actual: t.actualSqrtPrice.toString(),
      delta: spDelta.toString(),
      exact: spDelta === 0n,
    },
  ];
}

export function CompareTable({ rows }: { rows: CompareRow[] }) {
  return (
    <table className="compare">
      <thead>
        <tr>
          <th>Metric</th>
          <th>Predicted</th>
          <th>Actual</th>
          <th>Δ</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.metric} className={r.exact ? "exact" : "off"}>
            <td>{r.metric}</td>
            <td className="pred">{r.predicted}</td>
            <td className="act">{r.actual}</td>
            <td className="d">{r.delta}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
