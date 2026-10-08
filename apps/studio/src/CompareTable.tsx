import { sqrtPriceQ64ToPrice, toUi } from "dbc-curve-sim";
import type { LiveTrade } from "./chain/trade";
import { QUOTE_DECIMALS } from "./design";
import { price, sol, tokens } from "./format";

export interface CompareRow {
  metric: string;
  /** raw integer rows are shown as wrapped blocks, not table cells */
  raw?: boolean;
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
      delta: tokDelta === 0n ? "0" : `${pctOf(tokDelta, t.predictedOut).toFixed(4)}%`,
      exact: tokDelta === 0n,
    },
    {
      metric: "Token atoms",
      raw: true,
      predicted: t.predictedOut.toString(),
      actual: t.actualOut.toString(),
      delta: tokDelta.toString(),
      exact: tokDelta === 0n,
    },
    {
      metric: "Price after",
      predicted: `${price(px(t.predictedSqrtPrice))} SOL`,
      actual: `${price(px(t.actualSqrtPrice))} SOL`,
      delta: spDelta === 0n ? "0" : `${pctOf(spDelta, t.predictedSqrtPrice).toFixed(4)}%`,
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
      raw: true,
      predicted: t.predictedSqrtPrice.toString(),
      actual: t.actualSqrtPrice.toString(),
      delta: spDelta.toString(),
      exact: spDelta === 0n,
    },
  ];
}

export function CompareTable({ rows }: { rows: CompareRow[] }) {
  const raw = rows.filter((r) => r.raw);
  return (
    <>
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
        {rows.filter((r) => !r.raw).map((r) => (
          <tr key={r.metric} className={r.exact ? "exact" : "off"}>
            <td>{r.metric}</td>
            <td className="pred">{r.predicted}</td>
            <td className="act">{r.actual}</td>
            <td className="d">{r.delta}</td>
          </tr>
        ))}
      </tbody>
    </table>
    <div className="raw-ints">
      <div className="raw-title">Exact integers</div>
      {raw.map((r) => (
        <div key={r.metric} className={`raw ${r.exact ? "exact" : "off"}`}>
          <div className="raw-k">{r.metric}<span>Δ {r.delta}</span></div>
          <div className="raw-v"><i>pred</i>{r.predicted}</div>
          <div className="raw-v act"><i>act</i>{r.actual}</div>
        </div>
      ))}
    </div>
    </>
  );
}
