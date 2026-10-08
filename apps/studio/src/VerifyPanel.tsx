import { useEffect, useState } from "react";
import type { Analysis } from "./analysis";
import type { Deployment } from "./chain/deploy";
import type { LiveTrade } from "./chain/trade";
import type { Verification } from "./chain/verify";
import { Section } from "./fields";
import { CompareTable, compareRows } from "./CompareTable";
import "./verify.css";

export interface VerifyPanelProps {
  analysis: Analysis;
  deployment: Deployment | null;
  trades: LiveTrade[];
  check: Verification | "checking" | null;
  onGo: (where: "deploy") => void;
}

/** Predicted vs actual, from real devnet evidence. Only shows what Rekor measured. */
export function VerifyPanel({ deployment, trades, onGo }: VerifyPanelProps) {
  const design = deployment?.design;
  const [pick, setPick] = useState<number | null>(null);
  // follow the newest fill unless the user picked an older one
  useEffect(() => setPick(null), [trades.length]);
  if (!deployment) {
    return (
      <Section title="Nothing to verify yet">
        <p className="v-empty">Deploy the curve to devnet first. Rekor then reads the config back from chain and compares every real fill with its prediction.</p>
        <button type="button" className="cta v-go" onClick={() => onGo("deploy")}>Go to Deploy</button>
      </Section>
    );
  }
  if (trades.length === 0) {
    return (
      <Section title="No fills yet">
        <p className="v-empty">The pool is live. Make a buy on devnet and its predicted and actual results will be compared here.</p>
        <button type="button" className="cta v-go" onClick={() => onGo("deploy")}>Make a live trade</button>
      </Section>
    );
  }
  const idx = pick ?? trades.length - 1;
  const t = trades[idx];
  const rows = compareRows(t, design!.baseDecimals, design!.supplyTokens);
  const exact = rows.every((r) => r.exact);
  return (
    <>
      <div className={`v-verdict ${exact ? "ok" : "off"}`}>
        <strong>{exact ? "Exact match" : "Prediction differs"}</strong>
        <span>
          {exact
            ? "Rekor predicted this fill, the transaction executed, and the result is identical to the last token atom."
            : "The on-chain result differs from the prediction. The rows below show exactly where."}
        </span>
      </div>
      <Section title={idx === trades.length - 1 ? `Latest fill · #${idx + 1}` : `Fill #${idx + 1}`}>
        {trades.length > 1 && (
          <div className="fill-pick" role="group" aria-label="Choose fill">
            {trades.map((tr, i) => (
              <button key={tr.signature} type="button" className={`${i === idx ? "on" : ""} ${tr.actualOut === tr.predictedOut ? "ok" : "off"}`} onClick={() => setPick(i)}>
                #{i + 1}
              </button>
            ))}
          </div>
        )}
        <CompareTable rows={rows} />
      </Section>
    </>
  );
}
