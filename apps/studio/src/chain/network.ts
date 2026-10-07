import { Connection } from "@solana/web3.js";

export const DEVNET_RPC = import.meta.env.VITE_RPC_URL ?? "https://api.devnet.solana.com";
const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

let cached: Promise<Connection> | null = null;

/** Devnet connection. Rejects any RPC whose genesis isn't devnet's — this tool never touches mainnet. */
export function devnet(rpc = DEVNET_RPC): Promise<Connection> {
  if (rpc === DEVNET_RPC && cached) return cached;
  const p = (async () => {
    const connection = new Connection(rpc, "confirmed");
    const genesis = await connection.getGenesisHash();
    if (genesis !== DEVNET_GENESIS) throw new Error(`${rpc} is not devnet`);
    return connection;
  })();
  if (rpc === DEVNET_RPC) cached = p.catch((e) => ((cached = null), Promise.reject(e)));
  return p;
}

export const explorer = (kind: "tx" | "address", id: string) => `https://explorer.solana.com/${kind}/${id}?cluster=devnet`;
