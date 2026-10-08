import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import type { Connection } from "@solana/web3.js";
import type { SolveResult } from "dbc-curve-sim";
import type { Deployment } from "./deploy";

export interface FieldCheck {
  field: string;
  predicted: string;
  onChain: string;
  equal: boolean;
}

export type Verification =
  | { kind: "match"; segments: number; checks: FieldCheck[] }
  | { kind: "mismatch"; fields: string[]; checks: FieldCheck[] }
  | { kind: "missing" };

/** Read the PoolConfig back and require every curve field to equal the solved design. */
export async function verifyDeployment(connection: Connection, deployment: Deployment, solved: SolveResult): Promise<Verification> {
  const client = DynamicBondingCurveClient.create(connection, "confirmed");
  const [config, pool] = await Promise.all([client.state.getPoolConfig(deployment.config), client.state.getPool(deployment.pool)]);
  if (!config || !pool) return { kind: "missing" };
  const bad: string[] = [];
  const checks: FieldCheck[] = [];
  const eq = (field: string, a: bigint, b: { toString(): string }) => {
    const equal = a.toString() === b.toString();
    checks.push({ field, predicted: a.toString(), onChain: b.toString(), equal });
    if (!equal) bad.push(field);
  };
  eq("sqrtStartPrice", solved.config.sqrtStartPrice, config.sqrtStartPrice);
  eq("migrationSqrtPrice", solved.migrationSqrtPrice, config.migrationSqrtPrice);
  eq("migrationQuoteThreshold", solved.config.migrationQuoteThreshold, config.migrationQuoteThreshold);
  const live = config.curve.filter((p) => !p.liquidity.isZero());
  if (live.length !== solved.config.curve.length) bad.push("curve length");
  solved.config.curve.forEach((p, i) => {
    if (!live[i]) return;
    eq(`segment ${i + 1} price`, p.sqrtPrice, live[i].sqrtPrice);
    eq(`segment ${i + 1} liquidity`, p.liquidity, live[i].liquidity);
  });
  return bad.length ? { kind: "mismatch", fields: bad, checks } : { kind: "match", segments: live.length, checks };
}
