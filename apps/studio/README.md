# studio

The live app: design a Meteora Dynamic Bonding Curve and see exactly how it
will behave before deploying it. One page, no navigation.

```bash
pnpm install
pnpm build                              # from repo root: compiles dbc-curve-sim
pnpm --filter @rekor/studio dev         # http://localhost:5174
```

## What's on the page

A two-column workstation organised around one workflow — **Design → Simulate →
Deploy → Verify** — chosen in the top bar. The curve is the central object
throughout.

- **Top bar.** Brand, workflow stepper (completed stages are checked), a Devnet
  badge (the only network Rekor talks to) and the wallet state.
- **Market header.** Draft or live curve, supply, start/graduation MC, raise
  (live raised vs target once deployed), segment count and fee.
- **Chart workspace.** Price vs tokens sold with the predicted curve dominant,
  each segment shaded and labelled, start and graduation points marked, the
  first 5% of supply banded, simulated trades as hollow dots and real devnet
  fills as amber dots with a `predicted · actual · Δ` readout. Legend toggles
  every overlay except the prediction. Hover for price, SOL raised, slippage at
  the simulate size, and the hovered segment's supply range, price range,
  liquidity and SOL raised; axis tags show the exact values under the cursor.
- **Metrics strip.** Graduation MC, raise target, graduation price, cost to
  acquire 1%, cost to snipe 5%, creator and partner fees at graduation.
- **Data panel (tabs).** Segments (linked to the chart: hovering a row
  highlights its band), Simulation, Live Fills, Transactions, and Curve Math /
  Verification (every value create_config receives, beside what the program
  stored). Collapsible to give the chart full height.
- **Side panel by stage.**
  - *Design* — supply, segment shape (1–16 depth sliders and presets), fees,
    graduation. Every edit re-solves the curve; the footer shows solve status.
  - *Simulate* — buy/sell order entry with a pre-trade quote (tokens, average
    price, impact, price and MC after, fee) and the trade previewed on the curve.
  - *Deploy* — the configuration restated, wallet, balance, a two-step status
    timeline (Ready → Broadcasting → Confirmed / Failed), then a live trade box.
  - *Verify* — an exact-match verdict and a Metric | Predicted | Actual | Δ
    table for each fill, the full integers, and links to the evidence.
- **Status bar.** Copy config JSON, download `init-config.ts`, the npm install
  line, and the declared scope.

### UI-only assumptions

- There is no "Solve" button: the curve re-solves on every edit (an apply
  button was ruled out in the brief). The Design footer reports solve status.
- "Awaiting wallet" means no wallet is connected. Signing and sending a
  transaction share the *Broadcasting* state, because the wallet flow reports
  no separate signing event and wallet logic was left unchanged.
- Verify compares only what is measured on chain — tokens received and the
  pool's post-trade price (market cap follows from it). Fees aren't measured on
  chain, so they are not compared.

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
