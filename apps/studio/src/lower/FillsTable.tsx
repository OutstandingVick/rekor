import { sqrtPriceQ64ToPrice, toUi } from "dbc-curve-sim";
import { explorer } from "../chain/network";
import type { LiveTrade } from "../chain/trade";
import { QUOTE_DECIMALS } from "../design";
import { price, solFixed as sol, tokens } from "../format";
import "./table.ts";

/** Real devnet fills against the deployed pool, newest first. */
export function FillsTable({ trades, baseDecimals }: { trades: LiveTrade[]; baseDecimals: number }) {
  if (trades.length === 0) return <p className="lower-empty">No live fills yet. Deploy the curve, then buy on devnet from the Deploy panel.</p>;
  const b = (x: bigint) => toUi(x, baseDecimals);
  const px = (sp: bigint) => sqrtPriceQ64ToPrice(sp, baseDecimals, QUOTE_DECIMALS);
  return (
    <table className="dtable">
      <thead>
        <tr>
          <th>#</th>
          <th>SOL in</th>
          <th>Predicted tokens</th>
          <th>Actual tokens</th>
          <th>Price after</th>
          <th className="l">Result</th>
          <th className="l">Transaction</th>
        </tr>
      </thead>
      <tbody>
        {trades.map((t, i) => ({ t, n: i + 1 })).reverse().map(({ t, n }) => {
          const exact = t.actualOut === t.predictedOut;
          return (
            <tr key={t.signature}>
              <td className="dim">{n}</td>
              <td>{sol(toUi(t.quoteIn, QUOTE_DECIMALS))}</td>
              <td>{tokens(b(t.predictedOut))}</td>
              <td style={{ color: "var(--actual)" }}>{tokens(b(t.actualOut))}</td>
              <td>{price(px(t.actualSqrtPrice))}</td>
              <td className="l">{exact ? <span className="tag ok">exact</span> : <span className="tag bad">Δ {tokens(b(t.actualOut - t.predictedOut))}</span>}</td>
              <td className="l"><a href={explorer("tx", t.signature)} target="_blank" rel="noreferrer">{t.signature.slice(0, 10)}…</a></td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
