export interface Scale {
  (v: number): number;
  invert(px: number): number;
  ticks(n: number): number[];
}

export function linear(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const k = (r1 - r0) / (d1 - d0 || 1);
  const s = ((v: number) => r0 + (v - d0) * k) as Scale;
  s.invert = (px) => d0 + (px - r0) / k;
  s.ticks = (n) => {
    const step0 = (d1 - d0) / n;
    const mag = 10 ** Math.floor(Math.log10(step0));
    const step = [1, 2, 5, 10].map((m) => m * mag).find((x) => x >= step0) ?? step0;
    const out: number[] = [];
    for (let v = Math.ceil(d0 / step) * step; v <= d1 + step * 1e-9; v += step) out.push(v);
    return out;
  };
  return s;
}
