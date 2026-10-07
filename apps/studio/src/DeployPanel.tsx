import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import type { Analysis } from "./analysis";
import { ConnectWallet } from "./chain/ConnectWallet";
import { deployDesign } from "./chain/deploy";
import { describeError } from "./chain/errors";
import { devnet, explorer } from "./chain/network";
import { useBalance } from "./chain/useBalance";
import type { useDeployment } from "./chain/useDeployment";
import { useWalletSigner } from "./chain/useWalletSigner";
import { Section } from "./fields";
import "./deploy.css";

const MIN_DEPLOY_SOL = 0.05;
const short = (k: string) => `${k.slice(0, 4)}…${k.slice(-4)}`;

export function DeployPanel({ analysis, deploy }: { analysis: Analysis; deploy: ReturnType<typeof useDeployment> }) {
  const signer = useWalletSigner();
  const { lamports, refresh } = useBalance(signer?.publicKey ?? null);
  const { state } = deploy;
  const sol = lamports === null ? null : lamports / LAMPORTS_PER_SOL;
  const short_ = sol !== null && sol < MIN_DEPLOY_SOL;

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
        <div className="deploy">
          <button type="button" onClick={deploy.reset}>design a new curve</button>
        </div>
      </Section>
    );
  }

  return (
    <Section title="Deploy to devnet">
      <ConnectWallet />
      {signer && (
        <div className="deploy">
          <div className="balance">
            balance {sol === null ? "…" : `${sol.toFixed(3)} SOL`}
            {short_ && <span className="warn"> · need ≥ {MIN_DEPLOY_SOL} — <a href="https://faucet.solana.com" target="_blank" rel="noreferrer">faucet</a></span>}
          </div>
          <button type="button" className="go" disabled={!analysis.ok || state.kind === "deploying" || short_} onClick={run}>
            {state.kind === "deploying" ? (state.step === "config" ? "1/2 creating config…" : "2/2 creating pool…") : "deploy this curve"}
          </button>
          {!analysis.ok && <p className="muted">Fix the design first.</p>}
          {state.kind === "error" && <p className="error" role="alert">{state.message}</p>}
        </div>
      )}
    </Section>
  );
}
