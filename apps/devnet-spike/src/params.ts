import { buildCurve, type ConfigParameters } from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";
import { solveCurve, type FeeConfig, type SolveInput, type SolveResult } from "dbc-curve-sim";

const bn = (x: bigint) => new BN(x.toString());

/** The curve the spike deploys. Small numbers so a devnet faucet can graduate it. */
export const SPIKE_INTENT: SolveInput = {
  totalSupply: 1_000_000_000n * 10n ** 6n,
  baseDecimals: 6,
  quoteDecimals: 9,
  startPrice: "0.0000000003", // 0.3 SOL FDV
  graduationMarketCap: "3", // 3 SOL at graduation
  migrationQuoteThreshold: 500_000_000n, // 0.5 SOL raised
  weights: [1, 2, 3, 4, 5],
};

export const SPIKE_FEE_BPS = 100;
export const SPIKE_CREATOR_PCT = 50;

/** Our fee model for the fee settings below (constant 1%, collected in quote). */
export const SPIKE_FEES: FeeConfig = {
  baseFee: { cliffFeeNumerator: BigInt(SPIKE_FEE_BPS) * 100_000n, numberOfPeriod: 0, periodFrequency: 0n, reductionFactor: 0n, mode: "linear" },
  collectFeeMode: "quote",
  creatorTradingFeePercentage: SPIKE_CREATOR_PCT,
};

/**
 * Turn a solved curve into create_config parameters. Everything that isn't the
 * curve (fees, migration, LP split) comes from the SDK's own builder so it is
 * valid by construction; the curve fields are then replaced with ours verbatim.
 */
export function toConfigParameters(solved: SolveResult, intent: SolveInput): ConfigParameters {
  const template = buildCurve({
    token: { tokenType: 0, tokenBaseDecimal: intent.baseDecimals, tokenQuoteDecimal: intent.quoteDecimals, tokenAuthorityOption: 0, totalTokenSupply: 1_000_000_000, leftover: 0 },
    fee: {
      baseFeeParams: { baseFeeMode: 0, feeSchedulerParam: { startingFeeBps: SPIKE_FEE_BPS, endingFeeBps: SPIKE_FEE_BPS, numberOfPeriod: 0, totalDuration: 0 } },
      dynamicFeeEnabled: false,
      collectFeeMode: 0,
      creatorTradingFeePercentage: SPIKE_CREATOR_PCT,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: { migrationOption: 1, migrationFeeOption: 0, migrationFee: { feePercentage: 0, creatorFeePercentage: 0 } },
    liquidityDistribution: { partnerPermanentLockedLiquidityPercentage: 100, partnerLiquidityPercentage: 0, creatorPermanentLockedLiquidityPercentage: 0, creatorLiquidityPercentage: 0 },
    lockedVesting: { totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
    activationType: 0,
    percentageSupplyOnMigration: 20,
    migrationQuoteThreshold: 85,
  } as any);
  const { config } = solved;
  return {
    ...template,
    sqrtStartPrice: bn(config.sqrtStartPrice),
    curve: config.curve.map((p) => ({ sqrtPrice: bn(p.sqrtPrice), liquidity: bn(p.liquidity) })),
    migrationQuoteThreshold: bn(config.migrationQuoteThreshold),
    tokenSupply: { preMigrationTokenSupply: bn(intent.totalSupply), postMigrationTokenSupply: bn(intent.totalSupply) },
  } as ConfigParameters;
}

export function spike() {
  const solved = solveCurve(SPIKE_INTENT);
  if (solved.errors.length) throw new Error(solved.errors.join("; "));
  return { solved, params: toConfigParameters(solved, SPIKE_INTENT) };
}
