# studio

The live app: design a Meteora Dynamic Bonding Curve and see exactly how it
will behave before deploying it. One page, no navigation.

```bash
pnpm install
pnpm build                              # from repo root: compiles dbc-curve-sim
pnpm --filter @rekor/studio dev         # http://localhost:5174
```

## What's on the page

- **Left — config.** Supply, segment shape (1–16 depth sliders plus presets),
  fees, and graduation (start MC, graduation MC, SOL raised). Every change
  re-solves the curve with `solveCurve`; no liquidity number is hand-entered.
  The SOL-raised field shows the most the supply can back, and infeasible
  designs explain the shortfall instead of drawing a wrong curve.
- **Centre — chart.** Price vs tokens sold, one shaded band per segment, the
  first 5% of supply marked, graduation ringed with its market cap. Hover for
  price, SOL raised so far, and slippage for a buy of the simulate size.
  Below: graduation MC, cost to snipe 5%, creator and partner fees at graduation.
- **Right — simulate.** Local buys and sells against the designed pool; each
  lands as a dot on the curve, and the log shows which segments it walked.
- **Bottom — export.** Exact config JSON (integer strings, never floats), a
  `init-config.ts` that creates this config on devnet, and the npm install line.

All numbers come from `dbc-curve-sim`, which matches Meteora's SDK exactly
(`packages/dbc-curve-sim/test/sdk-parity.test.ts`) and matched live devnet
fills to the atom (`apps/devnet-spike/README.md`).

Scope: SOL quote, DAMM v2 migration, devnet. Not covered: mainnet deploy,
migration execution, post-migration pool management, Token-2022 hooks, rate
limiter fees.
