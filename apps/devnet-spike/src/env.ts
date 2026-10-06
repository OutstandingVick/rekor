import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Connection, Keypair } from "@solana/web3.js";

export const RPC_URL = process.env.REKOR_RPC ?? "https://api.devnet.solana.com";
export const KEYPAIR_PATH = process.env.REKOR_KEYPAIR ?? join(homedir(), ".config/solana/rekor-devnet.json");
export const DEPLOYMENT_FILE = new URL("../deployment.json", import.meta.url);

// The spike must never touch mainnet: refuse anything whose genesis isn't devnet's.
const DEVNET_GENESIS = "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcaWoxPkrZBG";

export async function devnet(): Promise<Connection> {
  const connection = new Connection(RPC_URL, "confirmed");
  const genesis = await connection.getGenesisHash();
  if (genesis !== DEVNET_GENESIS) throw new Error(`refusing to run: ${RPC_URL} is not devnet (genesis ${genesis})`);
  return connection;
}

export function wallet(): Keypair {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(KEYPAIR_PATH, "utf8"))));
}
