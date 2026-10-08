import { useState } from "react";
import { pct, sol, tokens as fmtTokens, price as fmtPrice } from "./format";
import type { Inspection } from "./inspect";
import { DEFAULT_OVERLAYS, type Overlays } from "./overlays";
import { segmentTone } from "./palette";
import type { PathPoint } from "./path";
import { linear } from "./scale";
import { useSize } from "./useSize";
import "./chart.css";

const M = { top: 28, right: 28, bottom: 40, left: 72 };

export interface ChartProps {
  path: PathPoint[][];
  graduationMcSol: number;
  supplyTokens: number;
  inspect: (sqrtPrice: bigint) => Inspection;
  probeSol: number;
  /** simulated trades, in order, as positions on the curve */
  simulated?: PathPoint[];
  /** real devnet fills, at the pool's measured post-trade price */
  actual?: PathPoint[];
  /** overlay content, e.g. the predicted-vs-actual readout */
  children?: React.ReactNode;
  show?: Overlays;
}

export function Chart({ path, graduationMcSol, supplyTokens, inspect, probeSol, simulated = [], actual = [], children, show = DEFAULT_OVERLAYS }: ChartProps) {
  const [ref, { width, height }] = useSize<HTMLDivElement>();
  const all = path.flat();
  const maxTokens = all.at(-1)?.tokens ?? 1;
  const maxPrice = Math.max(...all.map((p) => p.price), 0) * 1.08 || 1;
  const x = linear([0, maxTokens], [M.left, Math.max(M.left + 1, width - M.right)]);
  const y = linear([0, maxPrice], [Math.max(M.top + 1, height - M.bottom), M.top]);
  const [hover, setHover] = useState<PathPoint | null>(null);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    if (px < M.left || px > width - M.right || all.length === 0) return setHover(null);
    const t = x.invert(px);
    let best = all[0];
    for (const p of all) if (Math.abs(p.tokens - t) < Math.abs(best.tokens - t)) best = p;
    setHover(best);
  };
  const info = hover ? inspect(hover.sqrtPrice) : null;

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Price versus tokens sold" onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
          {y.ticks(5).map((t) => (
            <g key={`y${t}`}>
              <line className="grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
              <text className="tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{fmtPrice(t)}</text>
            </g>
          ))}
          {x.ticks(6).map((t) => (
            <text key={`x${t}`} className="tick" x={x(t)} y={height - M.bottom + 16} textAnchor="middle">{fmtTokens(t)}</text>
          ))}
          {show.snipe && (() => {
            const edge = Math.min(x(supplyTokens * 0.05), width - M.right);
            return (
              <g className="snipe-band">
                <rect x={M.left} y={M.top} width={Math.max(0, edge - M.left)} height={y(0) - M.top} />
                <text x={M.left + 6} y={M.top + 12}>first 5% of supply</text>
              </g>
            );
          })()}
          {path.map((seg, i) => {
            const line = seg.map((p, j) => `${j ? "L" : "M"}${x(p.tokens).toFixed(1)},${y(p.price).toFixed(1)}`).join("");
            const area = `${line}L${x(seg.at(-1)!.tokens).toFixed(1)},${y(0)}L${x(seg[0].tokens).toFixed(1)},${y(0)}Z`;
            return <path key={`a${i}`} className="terrain" d={area} fill={show.segments ? segmentTone(seg[0].segment) : "var(--curve-bg)"} />;
          })}
          {show.segments && path.slice(1).map((seg, i) => (
            <line key={`b${i}`} className="boundary" x1={x(seg[0].tokens)} x2={x(seg[0].tokens)} y1={y(0)} y2={y(seg[0].price)} />
          ))}
          <path
            className="curve"
            d={all.map((p, j) => `${j ? "L" : "M"}${x(p.tokens).toFixed(1)},${y(p.price).toFixed(1)}`).join("")}
          />
          {show.graduation && all.length > 0 && (
            <g className="graduation" transform={`translate(${x(all.at(-1)!.tokens)},${y(all.at(-1)!.price)})`}>
              <circle r={4} />
              <text x={-8} dy="0.32em" textAnchor="end">graduates · {sol(graduationMcSol)} SOL MC</text>
            </g>
          )}
          {show.trades && simulated.map((p, i) => (
            <circle key={`s${i}`} className="sim-dot" cx={x(p.tokens)} cy={y(p.price)} r={i === simulated.length - 1 ? 4.5 : 3} />
          ))}
          {show.actual && actual.map((p, i) => (
            <circle key={`r${i}`} className="actual-dot" cx={x(p.tokens)} cy={y(p.price)} r={i === actual.length - 1 ? 5 : 3.5} />
          ))}
          {hover && (
            <g className="crosshair">
              <line x1={x(hover.tokens)} x2={x(hover.tokens)} y1={M.top} y2={y(0)} />
              <circle cx={x(hover.tokens)} cy={y(hover.price)} r={3} />
            </g>
          )}
          <line className="axis" x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} />
          <text className="axis-title" x={width - M.right} y={height - 6} textAnchor="end">tokens sold →</text>
          <text className="axis-title" x={12} y={M.top - 12}>SOL / token</text>
        </svg>
      )}
      {children}
      {hover && info && (
        <div className="tooltip" style={{ left: Math.min(x(hover.tokens) + 12, width - 210), top: M.top + 8 }}>
          <div><span>price</span>{fmtPrice(hover.price)} SOL</div>
          <div><span>sold</span>{fmtTokens(hover.tokens)}</div>
          <div><span>raised</span>{sol(info.raisedSol)} SOL</div>
          <div><span>{probeSol} SOL buy</span>{info.graduates ? "graduates" : `+${pct(info.impact, 2)}`}</div>
          <div><span>segment</span>{hover.segment + 1}</div>
        </div>
      )}
    </div>
  );
}
