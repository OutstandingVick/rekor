# devnet-spike

Proves the loop end to end on devnet before any UI exists: solve a curve,
deploy that exact config, confirm the program stored it unchanged, trade
against it, and compare the fill with `dbc-curve-sim`'s prediction.

Refuses to run against anything but devnet (checked by genesis hash).

```bash
pnpm build                       # from repo root: compiles dbc-curve-sim
solana-keygen new -o ~/.config/solana/rekor-devnet.json   # or set REKOR_KEYPAIR
# fund that address at https://faucet.solana.com (devnet), ~1 SOL is plenty
pnpm --filter @rekor/devnet-spike run deploy     # create config + pool → deployment.json
pnpm --filter @rekor/devnet-spike run verify     # on-chain config == prediction, exactly
pnpm --filter @rekor/devnet-spike run trade      # buy 0.05 SOL; prints predicted · actual · Δ
pnpm --filter @rekor/devnet-spike run trade 120000000   # any lamport amount
```

`verify` and `trade` exit non-zero on any mismatch, so they can gate CI later.
The curve is deliberately tiny (0.3 → 3 SOL market cap, graduates at 0.5 SOL
raised) so a faucet-funded wallet can walk it across segments.
