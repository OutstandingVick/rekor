/**
 * Runs the studio's own deploy + live-trade code against devnet with a keypair
 * instead of a browser wallet. Same functions the page calls; only the Signer differs.
 *   REKOR_KEYPAIR=~/.config/solana/rekor-devnet.json pnpm --filter @rekor/studio e2e
 */
import "../src/polyfills";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { Keypair } from "@solana/web3.js";
import { analyze } from "../src/analysis";
import { deployDesign } from "../src/chain/deploy";
import { devnet, explorer } from "../src/chain/network";
import { keypairSigner } from "../src/chain/signer";
import { liveBuy } from "../src/chain/trade";
import type { Design } from "../src/design";

// Small enough for a faucet wallet to walk across segments.
const design: Design = {
  supplyTokens: 1_000_000_000,
  baseDecimals: 6,
  startMcSol: 0.3,
  graduationMcSol: 4,
  thresholdSol: 0.5,
  weights: [1, 2, 3, 4, 5],
  feeBps: 100,
  creatorPct: 50,
};

const path = process.env.REKOR_KEYPAIR ?? join(homedir(), ".config/solana/rekor-devnet.json");
const signer = keypairSigner(Keypair.fromSecretKey(Uint8Array.from(JSON.parse(readFileSync(path, "utf8")))));
const connection = await devnet();
const a = analyze(design);
if (!a.ok) throw new Error(a.error);

const d = await deployDesign(connection, signer, design, a.solved, (s) => console.log(`deploying ${s}…`));
console.log("config", explorer("address", d.config));
console.log("pool  ", explorer("address", d.pool));

let failed = false;
for (const lamports of [30_000_000n, 120_000_000n]) {
  const t = await liveBuy(connection, signer, d, a.solved, a.fees, lamports);
  const ok = t.actualOut === t.predictedOut && t.actualSqrtPrice === t.predictedSqrtPrice;
  failed ||= !ok;
  console.log(`${ok ? "MATCH" : "DIFF "} ${Number(lamports) / 1e9} SOL  predicted ${t.predictedOut}  actual ${t.actualOut}  ${explorer("tx", t.signature)}`);
}
process.exit(failed ? 1 : 0);
