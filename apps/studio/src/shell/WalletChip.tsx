import { useWallet } from "@solana/wallet-adapter-react";

const short = (k: string) => `${k.slice(0, 4)}…${k.slice(-4)}`;

/** Read-only wallet state for the top bar. Connecting happens in the Deploy panel, where it's needed. */
export function WalletChip({ onOpen }: { onOpen: () => void }) {
  const { publicKey, wallet, connecting } = useWallet();
  return (
    <button type="button" className={`wallet-chip ${publicKey ? "on" : ""}`} onClick={onOpen}>
      {wallet?.adapter.icon && publicKey && <img src={wallet.adapter.icon} alt="" width={14} height={14} />}
      <span className="mono">{publicKey ? short(publicKey.toBase58()) : connecting ? "connecting…" : "Connect wallet"}</span>
    </button>
  );
}
