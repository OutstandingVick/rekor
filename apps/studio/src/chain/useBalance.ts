import type { PublicKey } from "@solana/web3.js";
import { useCallback, useEffect, useState } from "react";
import { devnet } from "./network";

/** Devnet SOL balance in lamports; null while unknown. refresh() after any transaction. */
export function useBalance(owner: PublicKey | null) {
  const [lamports, setLamports] = useState<number | null>(null);
  const refresh = useCallback(async () => {
    if (!owner) return setLamports(null);
    try {
      setLamports(await (await devnet()).getBalance(owner));
    } catch {
      setLamports(null);
    }
  }, [owner]);
  useEffect(() => {
    void refresh();
  }, [refresh]);
  return { lamports, refresh };
}
