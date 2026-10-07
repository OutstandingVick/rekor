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
- **Right, below — deploy to devnet.** Connect a Wallet Standard wallet
  (Phantom, Solflare, Backpack) set to devnet, and deploy the current design:
  config, then pool. The page then locks to the deployed curve, reads the
  config back from chain and shows whether every field matches the design
  exactly, and becomes a live trade box. Each real buy is predicted from the
  pool's on-chain price, lands on the chart as a solid amber dot, and the
  readout shows `predicted · actual · Δ`.
- **Bottom — export.** Exact config JSON (integer strings, never floats), a
  `init-config.ts` that creates this config on devnet, and the npm install line.

## Proving the live path without a browser wallet

`scripts/e2e-devnet.ts` runs the page's own `deployDesign`, `verifyDeployment`
and `liveBuy` with a keypair signer instead of a wallet (the only difference),
and fails unless the config verifies and every fill matches to the atom:

```bash
REKOR_KEYPAIR=~/.config/solana/rekor-devnet.json pnpm --filter @rekor/studio e2e
```

Last run (2026-10-07): config `DrdFD8Es…`, pool `HLBzwHuq…`, on-chain config
matched on all 5 segments, and buys of 0.03 and 0.12 SOL filled exactly as
predicted
([tx](https://explorer.solana.com/tx/2HxyhWdV8A97CexgWjsmbeyZdFixTPoBZfyT7eE9n1zV1GAPuAFhuMLCQnz2z13HxpUcsSnySSttQr45PMsSQagf?cluster=devnet),
[tx](https://explorer.solana.com/tx/4cMicEB33stVdG6qvPqsDGBRuYhbJdQ1uVbgan1jmaNeBELiCgjpvm92odtzMwUJRAxJA7cohD1UuPTKUZNSghPV?cluster=devnet)).

All numbers come from `dbc-curve-sim`, which matches Meteora's SDK exactly
(`packages/dbc-curve-sim/test/sdk-parity.test.ts`) and matched live devnet
fills to the atom (`apps/devnet-spike/README.md`).

Scope: SOL quote, DAMM v2 migration, devnet. Not covered: mainnet deploy,
migration execution, post-migration pool management, Token-2022 hooks, rate
limiter fees.
