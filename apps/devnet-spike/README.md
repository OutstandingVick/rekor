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

## Result (2026-10-06, devnet)

The program accepted the solved 5-segment config unchanged, and two live buys
filled exactly as `dbc-curve-sim` predicted, to the atom.

| | Address / tx |
|---|---|
| Config | [`DyAR2n8LPYA347fKGLQEnDfWPs8NJbjWsUoiwCiUSCfC`](https://explorer.solana.com/address/DyAR2n8LPYA347fKGLQEnDfWPs8NJbjWsUoiwCiUSCfC?cluster=devnet) |
| Pool | [`4WtVG5K8bci2prDbgNbp6JSG3WZbiUAUsYVqEE1p1WRT`](https://explorer.solana.com/address/4WtVG5K8bci2prDbgNbp6JSG3WZbiUAUsYVqEE1p1WRT?cluster=devnet) |

| Buy | Predicted | Actual | Δ | Segments |
|---|---|---|---|---|
| [0.05 SOL](https://explorer.solana.com/tx/4Y3fovbDCh5md67cmDSBsNFHKGK8xmpd3WL6GxyWqLLUhDjcK51UTSW4PQpZfgTKkq6jGv3rmU8mpj31QonTBRFo?cluster=devnet) | 102,739,068.080766 | 102,739,068.080766 | 0.0000% | 0 → 1 |
| [0.2 SOL](https://explorer.solana.com/tx/2gVUnmowALfNZHEXDd1PT7NmqHfeTBCCWVXsf6oiux1PEJBH3QUDe1o4n4simfE1VUjuaWk42iA97q3z3h2e1yUK?cluster=devnet) | 176,046,470.421112 | 176,046,470.421112 | 0.0000% | 1 → 2 → 3 |

Post-trade sqrt prices also matched exactly (15142952930602437, 24077084873203479).
