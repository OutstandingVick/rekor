# Rekor — submission writeup

**Live app:** https://userekor.vercel.app
**GitHub:** https://github.com/OutstandingVick/rekor
**SDK:** `packages/dbc-curve-sim` (headless TypeScript, no dependencies)

## The gap

Meteora's Dynamic Bonding Curve lets a launch shape price discovery across up to 16 liquidity segments, but there is no way to know what a config will actually do — curve shape, sniper cost, graduation price — until it is deployed with real money, on a launch that only happens once.

## What Rekor does

Rekor closes that loop: **design a curve, see exactly how it will behave, deploy that exact config to devnet, and trade against it to confirm the prediction held.**

1. **Design.** Describe the launch — supply, start and graduation market cap, SOL to raise, and the shape of 1–16 segments. A solver derives every segment's liquidity; no number is hand-picked. Infeasible intents are refused with the reason ("this shape can back at most 51.39 SOL") instead of producing a broken config.
2. **Simulate.** The curve is charted segment by segment with graduation market cap, cost to acquire 1% and to snipe 5% of supply, graduation price, and creator/partner fees. Simulated buys and sells land on the curve with price impact and a per-segment breakdown.
3. **Deploy.** One click creates that exact config and a pool on devnet from your wallet. Rekor then reads the config back from chain and checks every field — start price, migration price, threshold, each segment's price and liquidity — against the design.
4. **Verify.** Every real buy is predicted from the pool's on-chain price before it is sent. The fill lands on the chart beside the prediction with `predicted · actual · Δ`, and a Predicted | Actual | Δ table shows tokens received and post-trade price down to the raw integers.

## Proof a judge can check without asking us

- **SDK parity.** `packages/dbc-curve-sim/test/sdk-parity.test.ts` builds real configs with Meteora's own SDK and asserts our quotes match it **exactly** (not "within rounding") across buys, sells, multi-segment crossings, fee modes and fee schedules. Changing one rounding direction breaks 12 tests. `pnpm test` runs it.
- **On-chain match.** `apps/devnet-spike/README.md` and `apps/studio/README.md` list devnet configs, pools and swaps where the program accepted the solved curve unchanged and every fill equalled the prediction to the token atom. The live app reproduces this with any wallet in a few minutes.
- **Same code, two signers.** `apps/studio/scripts/e2e-devnet.ts` runs the page's own deploy, verify and trade functions with a keypair instead of a wallet and fails unless everything matches.

## Three artifacts

- **Live app** — one page, no signup, works immediately on devnet.
- **SDK** — `dbc-curve-sim`: exact bigint Q64.64 curve math, swap simulation with per-segment steps, fee schedules, cost-to-acquire, the N-segment liquidity solver, and the program's supply rule. Usable standalone today.
- **Open repo** — everything above, MIT.

## Deliberately out of scope

Declared, not missing: mainnet deploy; migration/graduation execution; DAMM v2 post-migration pool management; Token-2022 transfer hooks; rate-limiter fees (deprecated for new configs); quote mints other than SOL; dynamic (volatility) fees.

## Built with

TypeScript, React 19, Vite, @meteora-ag/dynamic-bonding-curve-sdk, @solana/web3.js, Solana Wallet Adapter, Vitest.

---

# 90-second video script

| Time | On screen | Voiceover |
|---|---|---|
| 0:00–0:10 | Rekor logo → Design stage, default curve | "Meteora's bonding curve lets you shape a launch across up to sixteen segments. But you can't see what a config does until you've deployed it with real money — once." |
| 0:10–0:25 | Click the **Anti-snipe** preset, then **Deep start**; metrics strip changes | "Rekor fixes that. I describe the launch — supply, market caps, how much SOL to raise, the shape — and a solver derives the liquidity for every segment. Watch the cost to snipe five percent change as I reshape it." |
| 0:25–0:35 | Hover a segment → tooltip; Segments table row highlights | "Every segment is inspectable: supply range, price range, liquidity, SOL raised." |
| 0:35–0:45 | **Simulate**: show quote, click Buy twice, dots appear | "Simulate trades first — price impact, tokens out, where the pool lands." |
| 0:45–1:00 | **Deploy**: config summary, click deploy, approve 2 wallet prompts, **Confirmed** + "on-chain config matches exactly" | "Then deploy that exact config to devnet. Rekor reads it back from chain and checks every field against the design." |
| 1:00–1:15 | Live buy of ~1–2 SOL → amber dot lands on the curve, readout `Δ 0.0000%` | "Now a real buy. Rekor predicted it before sending. The amber dot is the actual fill — on the line, delta zero." |
| 1:15–1:25 | **Verify**: Exact match verdict, Predicted/Actual table, 13/13 fields exact | "Verify shows it to the last token atom — and links every transaction so you can check it yourself." |
| 1:25–1:30 | Logo + URL + GitHub | "Rekor. Design it, see it, deploy it, prove it. Live on devnet, open source, with the curve math as a standalone SDK." |

**Recording tips:** use a 1–2 SOL live buy so the amber dot sits visibly up the curve. Collapse the data panel (▼) during the chart shots for a bigger curve. Record at 1440×900 or larger.
