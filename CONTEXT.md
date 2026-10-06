# Rekor — project context

Read this first. It is the brief for a hackathon submission with a hard
deadline. Scope discipline matters more than feature count.

## The gap

> Meteora's Dynamic Bonding Curve lets a launch shape price discovery across
> up to 16 liquidity segments, but there is no way to know what a config will
> actually do — curve shape, sniper cost, and graduation price — until it is
> deployed with real money, on a launch that only happens once.

Rekor closes that: design a curve, see exactly how it will behave, deploy that
exact config to devnet, and trade against it to confirm the prediction held.

## Submission

Meteora "Best use of DBC" track, Superteam Earn, side track of Colosseum's
Crypto World's Fair. $20k USDC across five places ($10k / $5k / $3k / $1.5k /
$500). Build deadline **Oct 12 2026**, winners announced ~Oct 31. Aiming for
1st. Submission count was in single digits at the time of writing.

## What wins this track

Taken from the judges' writeup of a past hackathon's overall winner:

- A **concrete, nameable gap**, stated in one sentence, verifiable independent
  of the project.
- A **closed loop** — the whole lifecycle covered, nothing dangling.
- **Deliberate narrowness in service of completeness.** That winner exposed
  only four operations and was praised for it. Small surface, fully covered.
- **Three artifacts**: GitHub, live app, SDK others can build on today.
- **Demonstrable and verifiable** — a judge confirms the claim themselves
  without asking the author anything.

The failure mode this implies: a broad, impressive-sounding project where
every part is 70% done. Completeness beat ambition. Optimise accordingly.

## Deliverables

1. `packages/dbc-curve-sim` — headless curve math, published to npm.
2. `apps/studio` — the live app, one URL, works immediately.
3. Public GitHub repo.

Keep the package boundary strict. It must be independently importable and
usable, or it reads as a folder inside an app rather than infrastructure.

## In scope

- Multi-segment curve design (up to 16 segments)
- Price path, per-segment depth, reserves
- Cost to acquire the first N% of supply
- Graduation price and market cap from the migration threshold
- Base fee and fee scheduler projections for partner and creator
- Config JSON + TypeScript init script export
- Devnet deploy of the designed config
- Live trade against the deployed pool, plotted against the prediction

## Out of scope — state this explicitly in the submission

Declaring boundaries reads as rigor. Leaving them implicit reads as gaps.

- Mainnet deploy
- Migration / graduation execution (devnet migration is manual anyway)
- DAMM v2 post-migration pool management
- Token-2022 transfer hooks
- Rate limiter mode (deprecated for new configs)
- Quote mints beyond SOL

## Technical ground truth

Verified against Meteora docs. Do not re-derive from memory.

- Mainnet program: `dbcij3LWUppWqq96dh6gJWwBifmcGfLSB5D4DuSMaqN`
- DBC stores **sqrt price as Q64.64**: `price = sqrtPrice² / 2^128`
- A curve is `sqrtStartPrice` plus an array of `{sqrtPrice, liquidity}` points.
  Each consecutive pair forms a concentrated-liquidity range, so the math is
  Uniswap-v3 range math:
  - `Δquote = L · (√Pb − √Pa)`
  - `Δbase  = L · (1/√Pa − 1/√Pb)`
  - `√P_next = √Pa + Δquote / L`
- `progress = quoteReserve / migrationQuoteThreshold`
- Migration price is where quote reserve hits the threshold; it seeds the
  DAMM v2 pool
- Surplus above threshold: 80% to partner + creator, split by the creator
  trading fee percentage
- Single-segment liquidity recipe from the docs:
  `liquidity = z · 10^b · 2^128 / (maxSqrtPrice − sqrtStartPrice)`
  with `maxSqrtPrice = 79226673521066979257578248091`

Docs: `docs.meteora.ag/core-products/dbc/formulas` and
`/developer-guide/guides/dbc/bonding-curve-formulas`.
Program: `github.com/MeteoraAg/dynamic-bonding-curve`.

## State: day 1 complete

`packages/dbc-curve-sim` exists with 18 passing tests:

- `q64.ts` — Q64.64 conversions. All curve math is bigint; floats appear only
  at the display boundary. Keep it that way.
- `curve.ts` — segment resolution, Δquote/Δbase, reserve accumulators,
  migration price from threshold, progress, validation.
- `swap.ts` — buy/sell walking segments with a **per-segment step breakdown**,
  fees, price impact, cost-to-acquire-N%.

The step breakdown is load-bearing for the UI: it is what lets the chart shade
by segment and draw a trade's path through the terrain. Preserve it.

Tests reproduce the docs' worked example exactly (sqrtStartPrice 1, curve
[(2, 100), (4, 500)] → quote 100/1000, base 50/125, migration price 9) plus
invariants: monotonic output, no profitable round-trip, front-loaded liquidity
raising snipe cost.

### Open gate — close this before any UI work

The math is self-consistent but **has not been checked against the program**.
Install `@meteora-ag/dynamic-bonding-curve-sdk`, quote a real config, and
assert this package matches to within rounding. Make it a committed test, not
a one-time eyeball. This is the claim a judge can falsify.

### Next primitive to build

**An N-segment liquidity solver.** Given supply, start price, target
graduation market cap and migration threshold, derive the liquidity values.

This is not optional polish. Hand-picking liquidity numbers produces nonsense
— a scratch config during day 1 yielded 17 trillion tokens on the curve and a
10 SOL buy that moved price by 0%. That failure *is* the thesis, and the
solver is the primitive the whole product rests on. The natural-language
intent box becomes a thin shell over it rather than an LLM guessing numbers.

## Build order

Days are from Oct 1. Deadline Oct 12, so this is tight — the buffer is real.

| Days | Work | Gate |
|---|---|---|
| 1–3 | Curve math, headless. No UI. | Package quote matches an on-chain SDK quote to within rounding |
| 4–7 | Chart + segment editor + four headline numbers, live recalculation | Design a 5-segment curve and read its graduation MC in under a minute |
| 8–11 | Devnet deploy, wallet connect, live trade, predicted-vs-actual overlay | Deploy from the page, buy, see the dot land on the predicted line |
| 12–13 | Natural-language intent box over the solver | Three descriptions produce three sensibly different curves |
| 14 | Publish the npm package with its own README | Installable and usable standalone |
| 15–16 | Polish, empty/error states, deliberately break it with bad configs | Nothing jarring; 16 segments and absurd inputs don't crash |
| 17 | Writeup + 90-second video: design → deploy → trade → match | — |
| 18 | Buffer. Leave it empty. | — |

**Two standing rules.** Any day the math is in doubt, stop feature work and
fix the math. And if day 11 arrives without a working devnet deploy, cut
deploy entirely, ship simulation + SDK complete, and say so in the scope
section. A complete smaller thing beats two half-things.

## UI direction

One page, three zones, no navigation. Everything visible at once. A judge
should understand it without scrolling. The tool *is* the landing page — do
not build a marketing page.

- **Left (~320px)**: intent box at the top, then config grouped as supply &
  quote / curve segments / fees / graduation. Every field updates the chart on
  change, no apply button.
- **Centre**: price vs tokens sold. **Shade each segment differently** so the
  curve reads as terrain, not a smooth abstraction. Overlays: graduation
  marker with MC, shaded band for the first 5% of supply, hover showing price,
  cumulative quote raised, and slippage at size. Below it, four numbers in
  large type — **graduation MC, cost to snipe 5%, creator fees at graduation,
  partner fees at graduation**.
- **Right (~280px)**: simulate panel (local math, drops dots on the chart),
  then deploy-to-devnet panel which becomes a live trade box after deploy.
- **Bottom**: copy config JSON / download init script / copy npm install.
  Always visible, never in a modal.

**The moment that wins it:** after deploy, live trades land on the chart in a
different colour from simulated ones, on the same line, with a readout like
`predicted 0.00412 SOL · actual 0.00412 SOL · Δ 0.0%`. No explanation needed.

Visual tone: dark, terminal density, one accent for the curve and one for
actual-trade dots, everything else greyscale. Defer all other visual decisions
until the chart exists — they are downstream of what the tool has to show.

## Note on unverified claims

Earlier research produced a list of named Meteora team accounts, paraphrased
quotes, competitor projects to avoid cloning, and specific migration keeper
thresholds. **None of that was verified.** It is not in this brief and should
not be treated as fact or cited in the submission without checking. The
technical ground truth above came from the docs directly and is safe.
