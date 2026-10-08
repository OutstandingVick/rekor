import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { Verification } from "./chain/verify";
import type { Analysis } from "./analysis";
import { ConnectWallet } from "./chain/ConnectWallet";
import { deployDesign } from "./chain/deploy";
import { describeError } from "./chain/errors";
import { devnet, explorer } from "./chain/network";
import { useBalance } from "./chain/useBalance";
import type { useDeployment } from "./chain/useDeployment";
import { useWalletSigner } from "./chain/useWalletSigner";
import { Section } from "./fields";
import type { LiveTrade } from "./chain/trade";
import { LiveLog } from "./LiveLog";
import { LiveTradeBox } from "./LiveTradeBox";
import { ConfigSummary } from "./ConfigSummary";
import { DeploySteps } from "./DeploySteps";
import { StatusPill, type TxStatus } from "./StatusPill";
import "./deploy.css";

const MIN_DEPLOY_SOL = 0.05;
const short = (k: string) => `${k.slice(0, 4)}…${k.slice(-4)}`;

export interface DeployPanelProps {
  analysis: Analysis;
  deploy: ReturnType<typeof useDeployment>;
  onLiveTrade: (t: LiveTrade) => void;
  liveTrades: LiveTrade[];
  check: Verification | "checking" | null;
}

export function DeployPanel({ analysis, deploy, onLiveTrade, liveTrades, check }: DeployPanelProps) {
  const signer = useWalletSigner();
  const { lamports, refresh } = useBalance(signer?.publicKey ?? null);
  const { state } = deploy;
  const sol = lamports === null ? null : lamports / LAMPORTS_PER_SOL;
  const short_ = sol !== null && sol < MIN_DEPLOY_SOL;

  const status: TxStatus =
    state.kind === "deploying" ? "broadcasting" : state.kind === "error" ? "failed" : state.kind === "deployed" ? "confirmed" : signer ? "ready" : "wallet";
  const detail = state.kind === "deploying" ? (state.step === "config" ? "1/2 config" : "2/2 pool") : undefined;

  const run = async () => {
    if (!signer || !analysis.ok) return;
    try {
      const connection = await devnet();
      deploy.done(await deployDesign(connection, signer, analysis.design, analysis.solved, deploy.begin));
    } catch (e) {
      deploy.fail(describeError(e));
    } finally {
      void refresh();
    }
  };

  if (state.kind === "deployed") {
    const d = state.deployment;
    return (
      <Section title="Deployed · devnet">
        <dl className="deployed">
          <dt>pool</dt><dd><a href={explorer("address", d.pool)} target="_blank" rel="noreferrer">{short(d.pool)}</a></dd>
          <dt>config</dt><dd><a href={explorer("address", d.config)} target="_blank" rel="noreferrer">{short(d.config)}</a></dd>
          <dt>token</dt><dd><a href={explorer("address", d.baseMint)} target="_blank" rel="noreferrer">{short(d.baseMint)}</a></dd>
        </dl>
        <p className={`verify ${check && check !== "checking" ? check.kind : ""}`}>
          {check === "checking" && "reading config back from chain…"}
          {check !== null && check !== "checking" && check.kind === "match" && `✓ on-chain config matches the design exactly (${check.segments} segments)`}
          {check !== null && check !== "checking" && check.kind === "mismatch" && `✗ on-chain differs: ${check.fields.join(", ")}`}
          {check !== null && check !== "checking" && check.kind === "missing" && "pool not found on devnet (devnet may have been reset) — design a new curve"}
        </p>
        {!signer && <ConnectWallet />}
        <LiveTradeBox analysis={analysis} deployment={d} signer={signer} onTrade={onLiveTrade} onSettled={() => void refresh()} />
        <LiveLog trades={liveTrades} baseDecimals={d.design.baseDecimals} />
        <div className="deploy">
          <button type="button" onClick={deploy.reset}>design a new curve</button>
        </div>
      </Section>
    );
  }

  return (
    <>
    {analysis.ok && (
      <Section title="Configuration">
        <ConfigSummary design={analysis.design} thresholdSol={Number(analysis.solved.config.migrationQuoteThreshold) / 1e9} />
      </Section>
    )}
    <Section title="Deploy to devnet">
      <div className="deploy-status"><StatusPill status={status} detail={detail} /></div>
      <DeploySteps state={state} />
      <ConnectWallet />
      {signer && (
        <div className="deploy">
          <div className="balance">
            <span>Devnet balance</span>
            <strong className={short_ ? "warn" : ""}>{sol === null ? "…" : `${sol.toFixed(3)} SOL`}</strong>
          </div>
          {short_ && (
            <p className="warn-note">
              Need at least {MIN_DEPLOY_SOL} SOL — <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">faucet</a>
            </p>
          )}
          <button type="button" className="go" disabled={!analysis.ok || state.kind === "deploying" || short_} onClick={run}>
            {state.kind === "deploying" ? (state.step === "config" ? "1/2 creating config…" : "2/2 creating pool…") : "deploy this curve"}
          </button>
          {!analysis.ok && <p className="muted">Fix the design first.</p>}
          {state.kind === "error" && <p className="error" role="alert">{state.message}</p>}
        </div>
      )}
    </Section>
    </>
  );
}
