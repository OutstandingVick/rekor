import { useState } from "react";
import { pct, sol, tokens as fmtTokens, price as fmtPrice } from "./format";
import type { Inspection } from "./inspect";
import { DEFAULT_OVERLAYS, type Overlays } from "./overlays";
import { segmentTone } from "./palette";
import type { PathPoint } from "./path";
import type { SegmentStat } from "./segmentStats";
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
  /** segment to emphasise (from hover here or a table row elsewhere) */
  activeSegment?: number | null;
  onSegment?: (index: number | null) => void;
  stats?: SegmentStat[];
  /** where the next simulated buy would move the pool, from → to */
  preview?: { from: PathPoint; to: PathPoint } | null;
}

export function Chart({ path, graduationMcSol, supplyTokens, inspect, probeSol, simulated = [], actual = [], children, show = DEFAULT_OVERLAYS, activeSegment = null, onSegment, stats = [], preview = null }: ChartProps) {
  const [ref, { width, height }] = useSize<HTMLDivElement>();
  const all = path.flat();
  const maxTokens = all.at(-1)?.tokens ?? 1;
  const maxPrice = Math.max(...all.map((p) => p.price), 0) * 1.08 || 1;
  const x = linear([0, maxTokens], [M.left, Math.max(M.left + 1, width - M.right)]);
  const y = linear([0, maxPrice], [Math.max(M.top + 1, height - M.bottom), M.top]);
  const [hover, setHover] = useState<PathPoint | null>(null);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const px = e.clientX - e.currentTarget.getBoundingClientRect().left;
    if (px < M.left || px > width - M.right || all.length === 0) {
      onSegment?.(null);
      return setHover(null);
    }
    const t = x.invert(px);
    let best = all[0];
    for (const p of all) if (Math.abs(p.tokens - t) < Math.abs(best.tokens - t)) best = p;
    setHover(best);
    onSegment?.(best.segment);
  };
  const info = hover ? inspect(hover.sqrtPrice) : null;
  const seg = hover ? stats.find((st) => st.index === hover.segment) : undefined;

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Price versus tokens sold" onMouseMove={onMove} onMouseLeave={() => {
          setHover(null);
          onSegment?.(null);
        }}>
          <defs>
            <linearGradient id="curve-grad" x1={M.left} x2={width - M.right} y1="0" y2="0" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="var(--brand-sky)" />
              <stop offset="0.3" stopColor="var(--brand-sky)" />
              <stop offset="0.6" stopColor="var(--brand-green)" />
              <stop offset="1" stopColor="var(--brand-pink)" />
            </linearGradient>
          </defs>
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
            const active = activeSegment === seg[0].segment;
            return (
              <path
                key={`a${i}`}
                className={`terrain ${active ? "active" : ""} ${activeSegment !== null && !active ? "dim" : ""}`}
                d={area}
                fill={show.segments ? segmentTone(seg[0].segment) : "var(--curve-bg)"}
              />
            );
          })}
          {show.segments && path.map((seg) => {
            const x0 = x(seg[0].tokens), x1 = x(seg.at(-1)!.tokens);
            if (x1 - x0 < 22) return null;
            return (
              <text key={`l${seg[0].segment}`} className={`seg-label ${activeSegment === seg[0].segment ? "active" : ""}`} x={(x0 + x1) / 2} y={y(0) - 8} textAnchor="middle">
                S{seg[0].segment + 1}
              </text>
            );
          })}
          {show.segments && path.slice(1).map((seg, i) => (
            <line key={`b${i}`} className="boundary" x1={x(seg[0].tokens)} x2={x(seg[0].tokens)} y1={y(0)} y2={y(seg[0].price)} />
          ))}
          <path
            className="curve"
            d={all.map((p, j) => `${j ? "L" : "M"}${x(p.tokens).toFixed(1)},${y(p.price).toFixed(1)}`).join("")}
          />
          {all.length > 0 && (
            <g className="start-point" transform={`translate(${x(all[0].tokens)},${y(all[0].price)})`}>
              <circle r={3.5} />
              <text x={8} y={-8}>start · {fmtPrice(all[0].price)}</text>
            </g>
          )}
          {show.graduation && all.length > 0 && (
            <g className="graduation" transform={`translate(${x(all.at(-1)!.tokens)},${y(all.at(-1)!.price)})`}>
              <line className="grad-rule" x1={0} x2={0} y1={0} y2={y(0) - y(all.at(-1)!.price)} />
              <line className="grad-rule" x1={0} x2={M.left - x(all.at(-1)!.tokens)} y1={0} y2={0} />
              <circle r={5} />
              <g transform={`translate(-10,${y(all.at(-1)!.price) < M.top + 40 ? 22 : -4})`}>
                <rect className="grad-pill" x={width < 600 ? -128 : -178} y={-12} width={width < 600 ? 128 : 178} height={20} rx={4} />
                <text x={-8} y={2} textAnchor="end">{width < 600 ? `grad · ${sol(graduationMcSol)} SOL` : `graduates · ${sol(graduationMcSol)} SOL MC`}</text>
              </g>
            </g>
          )}
          {preview && (() => {
            const seg = all.filter((p) => p.tokens >= preview.from.tokens && p.tokens <= preview.to.tokens);
            const pts = [preview.from, ...seg, preview.to];
            return (
              <g className="preview">
                <path d={pts.map((p, j) => `${j ? "L" : "M"}${x(p.tokens).toFixed(1)},${y(p.price).toFixed(1)}`).join("")} />
                <circle cx={x(preview.to.tokens)} cy={y(preview.to.price)} r={4} />
              </g>
            );
          })()}
          {show.trades && simulated.map((p, i) => (
            <circle key={`s${i}`} className="sim-dot" cx={x(p.tokens)} cy={y(p.price)} r={i === simulated.length - 1 ? 4.5 : 3} />
          ))}
          {show.actual && actual.length > 0 && (
            <circle className="actual-halo" cx={x(actual.at(-1)!.tokens)} cy={y(actual.at(-1)!.price)} r={11} />
          )}
          {show.actual && actual.map((p, i) => (
            <circle key={`r${i}`} className="actual-dot" cx={x(p.tokens)} cy={y(p.price)} r={i === actual.length - 1 ? 5 : 3.5} />
          ))}
          {hover && (
            <g className="crosshair">
              <line x1={x(hover.tokens)} x2={x(hover.tokens)} y1={M.top} y2={y(0)} />
              <line x1={M.left} x2={x(hover.tokens)} y1={y(hover.price)} y2={y(hover.price)} />
              <circle cx={x(hover.tokens)} cy={y(hover.price)} r={3} />
              <g className="axis-tag" transform={`translate(${M.left - 2},${y(hover.price)})`}>
                <rect x={-66} y={-9} width={64} height={18} rx={3} />
                <text x={-6} dy="0.32em" textAnchor="end">{fmtPrice(hover.price)}</text>
              </g>
              <g className="axis-tag" transform={`translate(${x(hover.tokens)},${y(0) + 2})`}>
                <rect x={-30} y={0} width={60} height={18} rx={3} />
                <text y={9} dy="0.32em" textAnchor="middle">{fmtTokens(hover.tokens)}</text>
              </g>
            </g>
          )}
          <line className="axis" x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} />
          <text className="axis-title" x={width - M.right} y={height - 6} textAnchor="end">tokens sold →</text>
          <text className="axis-title" x={12} y={M.top - 12}>SOL / token</text>
        </svg>
      )}
      {children}
      {hover && info && (
        <div
          className="tooltip"
          style={{ left: x(hover.tokens) + 14 + 224 > width - 8 ? x(hover.tokens) - 14 - 224 : x(hover.tokens) + 14, top: M.top + 8 }}
        >
          <div className="tt-head">At cursor</div>
          <div><span>price</span>{fmtPrice(hover.price)} SOL</div>
          <div><span>sold</span>{fmtTokens(hover.tokens)}</div>
          <div><span>raised</span>{sol(info.raisedSol)} SOL</div>
          <div><span>{probeSol} SOL buy</span>{info.graduates ? "graduates" : `+${pct(info.impact, 2)}`}</div>
          {seg && (
            <>
              <div className="tt-head">Segment {seg.index + 1}{seg.graduates ? " · graduates here" : ""}</div>
              <div><span>supply</span>{fmtTokens(seg.fromTokens)} – {fmtTokens(seg.toTokens)}</div>
              <div><span>price</span>{fmtPrice(seg.startPrice)} – {fmtPrice(seg.endPrice)}</div>
              <div><span>price Δ</span>+{pct(seg.priceChange, 1)}</div>
              <div><span>SOL in segment</span>{sol(seg.segmentSol)}</div>
              <div><span>cumulative SOL</span>{sol(seg.cumulativeSol)}</div>
              <div><span>liquidity</span>{Number(seg.liquidity).toExponential(2)}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
