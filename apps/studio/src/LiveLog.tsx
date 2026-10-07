import { toUi } from "dbc-curve-sim";
import { explorer } from "./chain/network";
import type { LiveTrade } from "./chain/trade";
import { sol, tokens } from "./format";

export function LiveLog({ trades, baseDecimals }: { trades: LiveTrade[]; baseDecimals: number }) {
  if (trades.length === 0) return null;
  return (
    <ol className="log live-log" reversed>
      {[...trades].reverse().map((t) => (
        <li key={t.signature}>
          <div className="log-line">
            <span className="side live">live</span>
            {sol(toUi(t.quoteIn, 9))} SOL → {tokens(toUi(t.actualOut, baseDecimals))}
            <span className={`impact ${t.actualOut === t.predictedOut ? "match" : "diff"}`}>
              {t.actualOut === t.predictedOut ? "exact" : `Δ ${tokens(toUi(t.actualOut - t.predictedOut, baseDecimals))}`}
            </span>
          </div>
          <div className="log-steps">
            <a href={explorer("tx", t.signature)} target="_blank" rel="noreferrer">{t.signature.slice(0, 16)}…</a>
          </div>
        </li>
      ))}
    </ol>
  );
}
