import { WalletReadyState } from "@solana/wallet-adapter-base";
import { useWallet } from "@solana/wallet-adapter-react";

const short = (k: string) => `${k.slice(0, 4)}…${k.slice(-4)}`;

export function ConnectWallet() {
  const { wallets, wallet, publicKey, connecting, select, connect, disconnect } = useWallet();
  const installed = wallets.filter((w) => w.readyState === WalletReadyState.Installed);

  if (publicKey) {
    return (
      <div className="wallet-row">
        <span>{wallet?.adapter.name} · {short(publicKey.toBase58())}</span>
        <button type="button" onClick={() => disconnect()}>disconnect</button>
      </div>
    );
  }
  if (installed.length === 0) {
    return (
      <p className="muted">
        No Solana wallet detected. Install <a href="https://phantom.com" target="_blank" rel="noreferrer">Phantom</a> or{" "}
        <a href="https://solflare.com" target="_blank" rel="noreferrer">Solflare</a>, switch it to devnet, then reload.
      </p>
    );
  }
  return (
    <div className="wallet-list">
      {installed.map((w) => (
        <button
          key={w.adapter.name}
          type="button"
          disabled={connecting}
          onClick={async () => {
            select(w.adapter.name);
            await connect().catch(() => {});
          }}
        >
          {w.adapter.icon && <img src={w.adapter.icon} alt="" width={14} height={14} />}
          {connecting && wallet?.adapter.name === w.adapter.name ? "connecting…" : `connect ${w.adapter.name}`}
        </button>
      ))}
    </div>
  );
}
