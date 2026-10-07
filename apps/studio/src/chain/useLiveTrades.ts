import { useCallback, useEffect, useState } from "react";
import type { LiveTrade } from "./trade";

const key = (pool: string) => `rekor.trades.${pool}`;
const BIG: (keyof LiveTrade)[] = ["quoteIn", "predictedOut", "actualOut", "sqrtPriceBefore", "predictedSqrtPrice", "actualSqrtPrice"];

function load(pool: string): LiveTrade[] {
  try {
    const raw = JSON.parse(localStorage.getItem(key(pool)) ?? "[]") as Record<string, string>[];
    return raw.map((t) => Object.fromEntries(Object.entries(t).map(([k, v]) => [k, BIG.includes(k as keyof LiveTrade) ? BigInt(v) : v])) as unknown as LiveTrade);
  } catch {
    return [];
  }
}

function save(pool: string, trades: LiveTrade[]) {
  try {
    localStorage.setItem(key(pool), JSON.stringify(trades, (_, v) => (typeof v === "bigint" ? v.toString() : v)));
  } catch {
    // convenience only: every trade is also on chain
  }
}

/** Real fills against one deployed pool, remembered in this browser. */
export function useLiveTrades(pool: string | null) {
  const [trades, setTrades] = useState<LiveTrade[]>(() => (pool ? load(pool) : []));
  useEffect(() => setTrades(pool ? load(pool) : []), [pool]);
  const add = useCallback(
    (t: LiveTrade) =>
      setTrades((prev) => {
        const next = [...prev, t];
        if (pool) save(pool, next);
        return next;
      }),
    [pool],
  );
  return { trades, add };
}
