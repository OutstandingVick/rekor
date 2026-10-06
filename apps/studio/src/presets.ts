export interface Preset {
  name: string;
  hint: string;
  weights: (n: number) => number[];
}

const round = (w: number) => Math.round(w * 10) / 10;

export const PRESETS: Preset[] = [
  { name: "Flat", hint: "even depth everywhere", weights: (n) => Array(n).fill(1) },
  {
    name: "Anti-snipe",
    hint: "thin start: early buys move price fast, so the first 5% is expensive",
    weights: (n) => Array.from({ length: n }, (_, i) => round(1 + (9 * i) / Math.max(1, n - 1))),
  },
  {
    name: "Deep start",
    hint: "deep start: stable early price, cheap entry, steep finish",
    weights: (n) => Array.from({ length: n }, (_, i) => round(10 - (9 * i) / Math.max(1, n - 1))),
  },
  {
    name: "Plateau",
    hint: "deep middle: fast open and close, long stable discovery",
    weights: (n) => Array.from({ length: n }, (_, i) => round(1 + 9 * Math.sin((Math.PI * (i + 0.5)) / n))),
  },
];
