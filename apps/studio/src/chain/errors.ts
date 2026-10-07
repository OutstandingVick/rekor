/** Wallet and RPC failures as one line a launch designer can act on. */
export function describeError(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  const logs: string[] = (e as { logs?: string[] })?.logs ?? [];
  if (/user rejected|rejected the request|declined/i.test(msg)) return "Cancelled in wallet.";
  if (/insufficient (funds|lamports)|debit an account but found no record|0x1\b/i.test(msg + logs.join(" ")))
    return "Not enough devnet SOL. Fund the wallet at faucet.solana.com and retry.";
  if (/blockhash not found|block height exceeded|expired/i.test(msg)) return "Transaction expired before it landed. Retry.";
  if (/slippage|ExceededSlippage|0x1771/i.test(msg + logs.join(" "))) return "Price moved more than 1% before the trade landed. Retry.";
  if (/not devnet/i.test(msg)) return msg;
  const programLine = logs.find((l) => /Error|failed/.test(l));
  return programLine ? `Program rejected it: ${programLine.replace(/^Program log: /, "")}` : msg;
}
