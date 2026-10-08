import { toUi } from "dbc-curve-sim";
import type { Deployment } from "../chain/deploy";
import { explorer } from "../chain/network";
import type { LiveTrade } from "../chain/trade";
import { QUOTE_DECIMALS } from "../design";
import { sol } from "../format";
import "./table.ts";

/** Every devnet transaction Rekor sent for this deployment, in order. */
export function TransactionsTable({ deployment, trades }: { deployment: Deployment | null; trades: LiveTrade[] }) {
  if (!deployment) return <p className="lower-empty">Nothing on chain yet. Deploying creates two transactions (config, pool); each live buy adds one.</p>;
  const rows = [
    { kind: "Create config", sig: deployment.signatures.config, detail: deployment.config, addr: true },
    { kind: "Create pool", sig: deployment.signatures.pool, detail: deployment.pool, addr: true },
    ...trades.map((t) => ({ kind: "Buy", sig: t.signature, detail: `${sol(toUi(t.quoteIn, QUOTE_DECIMALS))} SOL`, addr: false })),
  ];
  return (
    <table className="dtable">
      <thead>
        <tr>
          <th>#</th>
          <th className="l">Type</th>
          <th className="l">Account / amount</th>
          <th className="l">Signature</th>
          <th className="l">Network</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.sig}>
            <td className="dim">{i + 1}</td>
            <td className="l">{r.kind}</td>
            <td className="l">{r.addr ? <a href={explorer("address", r.detail)} target="_blank" rel="noreferrer">{r.detail.slice(0, 6)}…{r.detail.slice(-6)}</a> : r.detail}</td>
            <td className="l"><a href={explorer("tx", r.sig)} target="_blank" rel="noreferrer">{r.sig.slice(0, 12)}…{r.sig.slice(-6)}</a></td>
            <td className="l"><span className="tag">devnet</span></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
