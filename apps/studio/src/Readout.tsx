import { toUi } from "dbc-curve-sim";
import type { LiveTrade } from "./chain/trade";
import { explorer } from "./chain/network";

/** predicted · actual · Δ for the latest real fill. Exact to the atom shows as Δ 0.0000%. */
export function Readout({ trade, baseDecimals }: { trade: LiveTrade; baseDecimals: number }) {
  const fmt = (x: bigint) => toUi(x, baseDecimals).toLocaleString("en-US", { maximumFractionDigits: 2 });
  const delta = trade.predictedOut === 0n ? 0 : Number(trade.actualOut - trade.predictedOut) / Number(trade.predictedOut);
  const exact = trade.actualOut === trade.predictedOut;
  return (
    <a className={`readout ${exact ? "exact" : "off"}`} href={explorer("tx", trade.signature)} target="_blank" rel="noreferrer">
      predicted <b>{fmt(trade.predictedOut)}</b> · actual <b className="act">{fmt(trade.actualOut)}</b> · Δ {(delta * 100).toFixed(4)}%
    </a>
  );
}
