import { toUi } from "dbc-curve-sim";
import { QUOTE_DECIMALS } from "../design";
import { pct, price, solFixed as sol, tokens } from "../format";
import { segmentTone } from "../palette";
import type { SimTrade } from "../simulation";
import "./table.ts";

/** Local simulated trades, newest first. Average price is quote ÷ tokens of that trade. */
export function SimulationTable({ trades, baseDecimals }: { trades: SimTrade[]; baseDecimals: number }) {
  if (trades.length === 0) return <p className="lower-empty">No simulated trades yet. Use Simulate to buy or sell against the designed pool.</p>;
  const q = (x: bigint) => toUi(x, QUOTE_DECIMALS);
  const b = (x: bigint) => toUi(x, baseDecimals);
  return (
    <table className="dtable">
      <thead>
        <tr>
          <th>#</th>
          <th className="l">Side</th>
          <th>SOL</th>
          <th>Tokens</th>
          <th>Avg price</th>
          <th>Price impact</th>
          <th>Fee (SOL)</th>
          <th className="l">Segments</th>
          <th>Holding after</th>
        </tr>
      </thead>
      <tbody>
        {[...trades].reverse().map(({ id, result: r, holding }) => {
          const solAmt = r.side === "buy" ? q(r.amountIn - r.amountLeft) : q(r.amountOut);
          const tok = r.side === "buy" ? b(r.amountOut) : b(r.amountIn - r.amountLeft);
          return (
            <tr key={id}>
              <td className="dim">{id}</td>
              <td className={`l ${r.side === "buy" ? "up" : "down"}`}>{r.side}</td>
              <td>{sol(solAmt)}</td>
              <td>{tokens(tok)}</td>
              <td>{tok > 0 ? price(solAmt / tok) : "—"}</td>
              <td className={r.side === "buy" ? "up" : "down"}>{r.side === "buy" ? "+" : "−"}{pct(Number(r.priceImpactBps) / 10_000, 2)}</td>
              <td className="dim">{sol(q(r.fee.total), 4)}</td>
              <td className="l">
                {r.steps.map((s) => (
                  <span key={s.segment} className="seg-chip">
                    <i style={{ background: segmentTone(s.segment) }} />S{s.segment + 1}
                  </span>
                ))}
              </td>
              <td>{tokens(b(holding))}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
