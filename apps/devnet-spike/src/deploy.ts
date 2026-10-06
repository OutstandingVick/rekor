import { writeFileSync } from "node:fs";
import { DynamicBondingCurveClient, deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { NATIVE_MINT } from "@solana/spl-token";
import { Keypair, LAMPORTS_PER_SOL, sendAndConfirmTransaction } from "@solana/web3.js";
import { DEPLOYMENT_FILE, devnet, wallet } from "./env.js";
import { spike } from "./params.js";

const MIN_BALANCE = 0.1 * LAMPORTS_PER_SOL;

const connection = await devnet();
const me = wallet();
const balance = await connection.getBalance(me.publicKey);
if (balance < MIN_BALANCE) {
  throw new Error(`wallet ${me.publicKey.toBase58()} has ${balance / LAMPORTS_PER_SOL} SOL; fund it from https://faucet.solana.com (devnet)`);
}

const { solved, params } = spike();
const client = DynamicBondingCurveClient.create(connection, "confirmed");
const configKp = Keypair.generate();
const baseMintKp = Keypair.generate();

const configTx = await client.partner.createConfig({
  ...params,
  config: configKp.publicKey,
  feeClaimer: me.publicKey,
  leftoverReceiver: me.publicKey,
  quoteMint: NATIVE_MINT,
  payer: me.publicKey,
});
const configSig = await sendAndConfirmTransaction(connection, configTx, [me, configKp]);
console.log("config ", configKp.publicKey.toBase58(), configSig);

const poolTx = await client.creator.createPool({
  name: "Rekor Spike",
  symbol: "RKSP",
  uri: "https://github.com/OutstandingVick/rekor",
  payer: me.publicKey,
  poolCreator: me.publicKey,
  config: configKp.publicKey,
  baseMint: baseMintKp.publicKey,
});
const poolSig = await sendAndConfirmTransaction(connection, poolTx, [me, baseMintKp]);
const pool = deriveDbcPoolAddress(NATIVE_MINT, baseMintKp.publicKey, configKp.publicKey);
console.log("pool   ", pool.toBase58(), poolSig);

writeFileSync(
  DEPLOYMENT_FILE,
  JSON.stringify(
    {
      cluster: "devnet",
      config: configKp.publicKey.toBase58(),
      pool: pool.toBase58(),
      baseMint: baseMintKp.publicKey.toBase58(),
      signatures: { config: configSig, pool: poolSig },
      predicted: {
        sqrtStartPrice: solved.config.sqrtStartPrice.toString(),
        migrationSqrtPrice: solved.migrationSqrtPrice.toString(),
        migrationQuoteThreshold: solved.config.migrationQuoteThreshold.toString(),
        curve: solved.config.curve.map((p) => ({ sqrtPrice: p.sqrtPrice.toString(), liquidity: p.liquidity.toString() })),
      },
    },
    null,
    2,
  ),
);
console.log("wrote deployment.json");
