import { sqrtPriceQ64ToPrice, toUi, type SwapResult } from "dbc-curve-sim";
import { QUOTE_DECIMALS } from "./design";
import { pct, price, sol, tokens } from "./format";

/** What the next buy would do, from the existing buy() preview. Shown before execution. */
export function QuoteSummary({ r, baseDecimals, supplyTokens }: { r: SwapResult; baseDecimals: number; supplyTokens: number }) {
  const solIn = toUi(r.amountIn - r.amountLeft, QUOTE_DECIMALS);
  const out = toUi(r.amountOut, baseDecimals);
  const after = sqrtPriceQ64ToPrice(r.sqrtPriceAfter, baseDecimals, QUOTE_DECIMALS);
  const rows: [string, string][] = [
    ["You receive", `${tokens(out)} tokens`],
    ["Avg price", out > 0 ? `${price(solIn / out)} SOL` : "—"],
    ["Price impact", `+${pct(Number(r.priceImpactBps) / 10_000, 2)}`],
    ["Price after", `${price(after)} SOL`],
    ["Market cap after", `${sol(after * supplyTokens)} SOL`],
    ["Fee", `${sol(toUi(r.fee.total, QUOTE_DECIMALS))} SOL`],
  ];
  return (
    <dl className="quote">
      {rows.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
      {r.amountLeft > 0n && <p className="quote-warn">Graduates mid-trade; {sol(toUi(r.amountLeft, QUOTE_DECIMALS))} SOL would be returned.</p>}
    </dl>
  );
}
