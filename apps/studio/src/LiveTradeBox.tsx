import { useState } from "react";
import type { Analysis } from "./analysis";
import type { Deployment } from "./chain/deploy";
import { describeError } from "./chain/errors";
import { devnet } from "./chain/network";
import { liveBuy, type LiveTrade } from "./chain/trade";
import type { Signer } from "./chain/signer";
import { NumberField } from "./fields";

export interface LiveTradeBoxProps {
  analysis: Analysis;
  deployment: Deployment;
  signer: Signer | null;
  onTrade: (t: LiveTrade) => void;
  onSettled: () => void;
}

export function LiveTradeBox({ analysis, deployment, signer, onTrade, onSettled }: LiveTradeBoxProps) {
  const [size, setSize] = useState(0.05);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = async () => {
    if (!signer || !analysis.ok) return;
    setBusy(true);
    setError(null);
    try {
      const lamports = BigInt(Math.round(size * 1e9));
      onTrade(await liveBuy(await devnet(), signer, deployment, analysis.solved, analysis.fees, lamports));
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBusy(false);
      onSettled();
    }
  };

  return (
    <div className="deploy live">
      <NumberField label="Live buy" unit="SOL" value={size} min={0.001} max={100} onChange={setSize} />
      <button type="button" className="go actual" disabled={!signer || busy || !analysis.ok} onClick={go}>
        {busy ? "confirming…" : signer ? "buy on devnet" : "connect a wallet to trade"}
      </button>
      {error && <p className="error" role="alert">{error}</p>}
    </div>
  );
}
