import { toUi } from "dbc-curve-sim";
import { QUOTE_DECIMALS } from "./design";
import { pct, sol, tokens } from "./format";
import { segmentTone } from "./palette";
import type { SimTrade } from "./simulation";

export function TradeLog({ trades, baseDecimals, segmentCount }: { trades: SimTrade[]; baseDecimals: number; segmentCount: number }) {
  if (trades.length === 0) return <p className="log-empty">Buy to drop trades on the curve.</p>;
  const q = (x: bigint) => sol(toUi(x, QUOTE_DECIMALS));
  const b = (x: bigint) => tokens(toUi(x, baseDecimals));
  return (
    <ol className="log" reversed>
      {[...trades].reverse().map(({ id, result: r }) => (
        <li key={id}>
          <div className="log-line">
            <span className={`side ${r.side}`}>{r.side}</span>
            {r.side === "buy" ? `${q(r.amountIn - r.amountLeft)} SOL → ${b(r.amountOut)}` : `${b(r.amountIn - r.amountLeft)} → ${q(r.amountOut)} SOL`}
            <span className="impact">{r.side === "buy" ? "+" : "−"}{pct(Number(r.priceImpactBps) / 10_000, 2)}</span>
          </div>
          <div className="log-steps" aria-label="Segments crossed">
            {r.steps.map((s) => (
              <span key={s.segment} title={`segment ${s.segment + 1}: ${r.side === "buy" ? `${q(s.amountIn)} SOL in, ${b(s.amountOut)} out` : `${b(s.amountIn)} in, ${q(s.amountOut)} SOL out`}`}>
                <i style={{ background: segmentTone(s.segment, segmentCount) }} />
                {s.segment + 1}
              </span>
            ))}
            <span className="fee">fee {q(r.fee.total)}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
