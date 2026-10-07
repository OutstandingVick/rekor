import { buildCurve, type ConfigParameters } from "@meteora-ag/dynamic-bonding-curve-sdk";
import BN from "bn.js";
import type { SolveResult } from "dbc-curve-sim";
import { QUOTE_DECIMALS, type Design } from "../design";

const bn = (x: bigint) => new BN(x.toString());

/**
 * create_config parameters for a solved design. Non-curve fields come from the
 * SDK's buildCurve (valid by construction); the curve is ours, verbatim. Same
 * recipe the devnet spike proved the program accepts unchanged.
 */
export function toConfigParameters(design: Design, solved: SolveResult): ConfigParameters {
  const template = buildCurve({
    token: { tokenType: 0, tokenBaseDecimal: design.baseDecimals, tokenQuoteDecimal: QUOTE_DECIMALS, tokenAuthorityOption: 0, totalTokenSupply: 1_000_000_000, leftover: 0 },
    fee: {
      baseFeeParams: { baseFeeMode: 0, feeSchedulerParam: { startingFeeBps: design.feeBps, endingFeeBps: design.feeBps, numberOfPeriod: 0, totalDuration: 0 } },
      dynamicFeeEnabled: false,
      collectFeeMode: 0,
      creatorTradingFeePercentage: design.creatorPct,
      poolCreationFee: 0,
      enableFirstSwapWithMinFee: false,
    },
    migration: { migrationOption: 1, migrationFeeOption: 0, migrationFee: { feePercentage: 0, creatorFeePercentage: 0 } },
    liquidityDistribution: { partnerPermanentLockedLiquidityPercentage: 100, partnerLiquidityPercentage: 0, creatorPermanentLockedLiquidityPercentage: 0, creatorLiquidityPercentage: 0 },
    lockedVesting: { totalLockedVestingAmount: 0, numberOfVestingPeriod: 0, cliffUnlockAmount: 0, totalVestingDuration: 0, cliffDurationFromMigrationTime: 0 },
    activationType: 0,
    percentageSupplyOnMigration: 20,
    migrationQuoteThreshold: 85,
  } as Parameters<typeof buildCurve>[0]);
  const supply = solved.supply.total;
  return {
    ...template,
    sqrtStartPrice: bn(solved.config.sqrtStartPrice),
    curve: solved.config.curve.map((p) => ({ sqrtPrice: bn(p.sqrtPrice), liquidity: bn(p.liquidity) })),
    migrationQuoteThreshold: bn(solved.config.migrationQuoteThreshold),
    tokenSupply: { preMigrationTokenSupply: bn(supply), postMigrationTokenSupply: bn(supply) },
  } as ConfigParameters;
}
