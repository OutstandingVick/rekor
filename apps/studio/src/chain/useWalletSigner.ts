import { useWallet } from "@solana/wallet-adapter-react";
import { useMemo } from "react";
import { confirm, type Signer } from "./signer";

/**
 * The connected wallet as a Signer. Fresh keypairs (config, base mint) sign
 * first, then the wallet signs as fee payer, then we send and confirm ourselves
 * so every wallet behaves the same.
 */
export function useWalletSigner(): Signer | null {
  const { publicKey, signTransaction, sendTransaction } = useWallet();
  return useMemo(() => {
    if (!publicKey) return null;
    return {
      publicKey,
      async send(connection, tx, extra = []) {
        const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
        tx.feePayer = publicKey;
        tx.recentBlockhash = blockhash;
        if (signTransaction) {
          if (extra.length) tx.partialSign(...extra);
          const signed = await signTransaction(tx);
          const sig = await connection.sendRawTransaction(signed.serialize());
          return confirm(connection, sig, blockhash, lastValidBlockHeight);
        }
        const sig = await sendTransaction(tx, connection, { signers: extra });
        return confirm(connection, sig, blockhash, lastValidBlockHeight);
      },
    };
  }, [publicKey, signTransaction, sendTransaction]);
}
