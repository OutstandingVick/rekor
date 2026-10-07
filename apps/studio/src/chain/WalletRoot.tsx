import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import type { ReactNode } from "react";
import { DEVNET_RPC } from "./network";

/** Wallet Standard auto-detects Phantom, Solflare, Backpack… — no per-wallet adapters to bundle. */
export function WalletRoot({ children }: { children: ReactNode }) {
  return (
    <ConnectionProvider endpoint={DEVNET_RPC}>
      <WalletProvider wallets={[]} autoConnect>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
}
