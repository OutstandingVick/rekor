import { type Connection, type Keypair, type PublicKey, type Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

/**
 * Anything that can pay for and sign a transaction. The browser wraps the
 * connected wallet; scripts and tests wrap a keypair. Deploy and trade logic
 * only ever see this, so the same code runs in both.
 */
export interface Signer {
  publicKey: PublicKey;
  /** sign (plus any fresh keypairs the tx creates), send, confirm; returns the signature */
  send(connection: Connection, tx: Transaction, extraSigners?: Keypair[]): Promise<string>;
}

export function keypairSigner(kp: Keypair): Signer {
  return {
    publicKey: kp.publicKey,
    send: (connection, tx, extra = []) => sendAndConfirmTransaction(connection, tx, [kp, ...extra], { commitment: "confirmed" }),
  };
}

/** Confirm a signature against the blockhash it was sent with. */
export async function confirm(connection: Connection, signature: string, blockhash: string, lastValidBlockHeight: number) {
  const res = await connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, "confirmed");
  if (res.value.err) throw new Error(`transaction failed: ${JSON.stringify(res.value.err)}`);
  return signature;
}
