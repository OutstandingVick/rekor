import { readFileSync } from "node:fs";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { PublicKey, sendAndConfirmTransaction } from "@solana/web3.js";
import BN from "bn.js";
import { buy } from "dbc-curve-sim";
import { DEPLOYMENT_FILE, devnet, wallet } from "./env.js";
import { SPIKE_FEES, spike } from "./params.js";

const quoteIn = BigInt(process.argv[2] ?? "50000000"); // lamports, default 0.05 SOL

const deployment = JSON.parse(readFileSync(DEPLOYMENT_FILE, "utf8"));
const connection = await devnet();
const me = wallet();
const client = DynamicBondingCurveClient.create(connection, "confirmed");
const baseMint = new PublicKey(deployment.baseMint);
const ata = getAssociatedTokenAddressSync(baseMint, me.publicKey);

const balanceOf = async () => {
  const info = await connection.getTokenAccountBalance(ata).catch(() => null);
  return BigInt(info?.value.amount ?? "0");
};

const account = await client.state.getPool(deployment.pool);
if (!account) throw new Error(`pool ${deployment.pool} not found`);
const { solved } = spike();
const prediction = buy(solved.config, { sqrtPrice: BigInt(account.poolState.sqrtPrice.toString()) }, quoteIn, SPIKE_FEES);

const before = await balanceOf();
const tx = await client.pool.swap({
  owner: me.publicKey,
  pool: new PublicKey(deployment.pool),
  amountIn: new BN(quoteIn.toString()),
  minimumAmountOut: new BN(((prediction.amountOut * 99n) / 100n).toString()),
  swapBaseForQuote: false,
  referralTokenAccount: null,
});
const sig = await sendAndConfirmTransaction(connection, tx, [me]);
const actual = (await balanceOf()) - before;
const after = await client.state.getPool(deployment.pool);

const ui = (x: bigint) => (Number(x) / 1e6).toLocaleString("en-US", { maximumFractionDigits: 6 });
const delta = Number(actual - prediction.amountOut) / Number(prediction.amountOut);
console.log(`tx ${sig}`);
console.log(`predicted ${ui(prediction.amountOut)} · actual ${ui(actual)} · Δ ${(delta * 100).toFixed(4)}%`);
console.log(`price √P predicted ${prediction.sqrtPriceAfter} · actual ${after?.poolState.sqrtPrice}`);
console.log(`segments crossed: ${prediction.steps.map((s) => s.segment).join(" → ")}`);
if (actual !== prediction.amountOut) process.exit(1);
