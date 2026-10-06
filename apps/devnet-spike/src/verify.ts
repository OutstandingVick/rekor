import { readFileSync } from "node:fs";
import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { compareConfig } from "./compare.js";
import { DEPLOYMENT_FILE, devnet } from "./env.js";

const deployment = JSON.parse(readFileSync(DEPLOYMENT_FILE, "utf8"));
const client = DynamicBondingCurveClient.create(await devnet(), "confirmed");

const config = await client.state.getPoolConfig(deployment.config);
if (!config) throw new Error(`config ${deployment.config} not found on devnet`);
const account = await client.state.getPool(deployment.pool);
if (!account) throw new Error(`pool ${deployment.pool} not found on devnet`);

const pool = account.poolState;
const mismatches = compareConfig(deployment.predicted, config);
if (pool.quoteReserve.isZero() && pool.sqrtPrice.toString() !== deployment.predicted.sqrtStartPrice) {
  mismatches.push({ field: "pool.sqrtPrice", predicted: deployment.predicted.sqrtStartPrice, onChain: pool.sqrtPrice.toString() });
}

if (mismatches.length) {
  console.table(mismatches);
  process.exit(1);
}
console.log(`on-chain config ${deployment.config} matches the prediction exactly (${deployment.predicted.curve.length} segments, migration √P ${config.migrationSqrtPrice})`);
