import { DynamicBondingCurveClient, deriveDbcPoolAddress } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { NATIVE_MINT } from "@solana/spl-token";
import { type Connection, Keypair } from "@solana/web3.js";
import type { SolveResult } from "dbc-curve-sim";
import type { Design } from "../design";
import { toConfigParameters } from "./params";
import type { Signer } from "./signer";

export interface Deployment {
  config: string;
  pool: string;
  baseMint: string;
  signatures: { config: string; pool: string };
  /** the exact design deployed; predictions for live trades use this, not later edits */
  design: Design;
  deployedAt: string;
}

export type DeployStep = "config" | "pool";

/** Create the designed config, then a pool on it. Two transactions, each confirmed before the next. */
export async function deployDesign(
  connection: Connection,
  signer: Signer,
  design: Design,
  solved: SolveResult,
  onStep: (step: DeployStep) => void = () => {},
): Promise<Deployment> {
  const client = DynamicBondingCurveClient.create(connection, "confirmed");
  const configKp = Keypair.generate();
  const baseMintKp = Keypair.generate();

  onStep("config");
  const configTx = await client.partner.createConfig({
    ...toConfigParameters(design, solved),
    config: configKp.publicKey,
    feeClaimer: signer.publicKey,
    leftoverReceiver: signer.publicKey,
    quoteMint: NATIVE_MINT,
    payer: signer.publicKey,
  });
  const configSig = await signer.send(connection, configTx, [configKp]);

  onStep("pool");
  const poolTx = await client.creator.createPool({
    name: "Rekor Curve",
    symbol: "RKR",
    uri: "https://github.com/OutstandingVick/rekor",
    payer: signer.publicKey,
    poolCreator: signer.publicKey,
    config: configKp.publicKey,
    baseMint: baseMintKp.publicKey,
  });
  const poolSig = await signer.send(connection, poolTx, [baseMintKp]);

  return {
    config: configKp.publicKey.toBase58(),
    pool: deriveDbcPoolAddress(NATIVE_MINT, baseMintKp.publicKey, configKp.publicKey).toBase58(),
    baseMint: baseMintKp.publicKey.toBase58(),
    signatures: { config: configSig, pool: poolSig },
    design,
    deployedAt: new Date().toISOString(),
  };
}
