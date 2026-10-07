import { DynamicBondingCurveClient } from "@meteora-ag/dynamic-bonding-curve-sdk";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { type Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { buy, type FeeConfig, type SolveResult } from "dbc-curve-sim";
import type { Deployment } from "./deploy";
import type { Signer } from "./signer";

export interface LiveTrade {
  signature: string;
  quoteIn: bigint;
  predictedOut: bigint;
  actualOut: bigint;
  sqrtPriceBefore: bigint;
  predictedSqrtPrice: bigint;
  actualSqrtPrice: bigint;
}

/** Current pool sqrt price from chain. */
export async function poolSqrtPrice(connection: Connection, deployment: Deployment): Promise<bigint> {
  const client = DynamicBondingCurveClient.create(connection, "confirmed");
  const account = await client.state.getPool(deployment.pool);
  if (!account) throw new Error(`pool ${deployment.pool} not found on devnet`);
  return BigInt(account.poolState.sqrtPrice.toString());
}

/**
 * Buy `quoteIn` lamports of the deployed token. The prediction is made from the
 * pool's on-chain price immediately before sending, with the same buy() the
 * parity tests cover; the actual is the signer's base balance delta.
 */
export async function liveBuy(
  connection: Connection,
  signer: Signer,
  deployment: Deployment,
  solved: SolveResult,
  fees: FeeConfig,
  quoteIn: bigint,
): Promise<LiveTrade> {
  const client = DynamicBondingCurveClient.create(connection, "confirmed");
  const ata = getAssociatedTokenAddressSync(new PublicKey(deployment.baseMint), signer.publicKey);
  const balance = async () => BigInt((await connection.getTokenAccountBalance(ata).catch(() => null))?.value.amount ?? "0");

  const sqrtPriceBefore = await poolSqrtPrice(connection, deployment);
  const prediction = buy(solved.config, { sqrtPrice: sqrtPriceBefore }, quoteIn, fees);
  if (prediction.amountLeft > 0n) throw new Error("this buy would graduate the curve; migration is out of scope — buy less");

  const before = await balance();
  const tx = await client.pool.swap({
    owner: signer.publicKey,
    pool: new PublicKey(deployment.pool),
    amountIn: new BN(quoteIn.toString()),
    minimumAmountOut: new BN(((prediction.amountOut * 99n) / 100n).toString()),
    swapBaseForQuote: false,
    referralTokenAccount: null,
  });
  const signature = await signer.send(connection, tx);

  return {
    signature,
    quoteIn,
    predictedOut: prediction.amountOut,
    actualOut: (await balance()) - before,
    sqrtPriceBefore,
    predictedSqrtPrice: prediction.sqrtPriceAfter,
    actualSqrtPrice: await poolSqrtPrice(connection, deployment),
  };
}
