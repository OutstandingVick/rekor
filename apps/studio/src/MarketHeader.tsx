import type { Deployment } from "./chain/deploy";
import type { Design } from "./design";
import { explorer } from "./chain/network";
import { sol } from "./format";

/** Token/market header over the workspace: what curve this is and whether it's live. */
export function MarketHeader({ design, deployment, thresholdSol }: { design: Design; deployment: Deployment | null; thresholdSol: number | null }) {
  return (
    <div className="market-head">
      <div className="mh-token">
        <span className="mh-icon" aria-hidden="true">R</span>
        <div>
          <strong>{deployment ? "Rekor Curve" : "Draft curve"}</strong>
          <span className="mh-sym">{deployment ? "RKR · SOL" : "not deployed"}</span>
        </div>
        {deployment ? (
          <a className="mh-live" href={explorer("address", deployment.pool)} target="_blank" rel="noreferrer">● live on devnet</a>
        ) : (
          <span className="mh-draft">draft</span>
        )}
      </div>
      <dl className="mh-stats">
        <div><dt>Supply</dt><dd>{design.supplyTokens.toLocaleString("en-US")}</dd></div>
        <div><dt>Start MC</dt><dd>{sol(design.startMcSol)} SOL</dd></div>
        <div><dt>Graduation MC</dt><dd>{sol(design.graduationMcSol)} SOL</dd></div>
        <div><dt>Raise</dt><dd>{thresholdSol === null ? "—" : `${sol(thresholdSol)} SOL`}</dd></div>
        <div><dt>Segments</dt><dd>{design.weights.length}</dd></div>
        <div><dt>Fee</dt><dd>{design.feeBps} bps</dd></div>
      </dl>
    </div>
  );
}
