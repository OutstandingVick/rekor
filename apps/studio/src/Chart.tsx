import { sol, tokens as fmtTokens, price as fmtPrice } from "./format";
import { segmentTone } from "./palette";
import type { PathPoint } from "./path";
import { linear } from "./scale";
import { useSize } from "./useSize";
import "./chart.css";

const M = { top: 16, right: 20, bottom: 28, left: 64 };

export interface ChartProps {
  path: PathPoint[][];
  graduationMcSol: number;
  supplyTokens: number;
}

export function Chart({ path, graduationMcSol, supplyTokens }: ChartProps) {
  const [ref, { width, height }] = useSize<HTMLDivElement>();
  const all = path.flat();
  const maxTokens = all.at(-1)?.tokens ?? 1;
  const maxPrice = Math.max(...all.map((p) => p.price), 0) * 1.08 || 1;
  const x = linear([0, maxTokens], [M.left, Math.max(M.left + 1, width - M.right)]);
  const y = linear([0, maxPrice], [Math.max(M.top + 1, height - M.bottom), M.top]);

  return (
    <div className="chart" ref={ref}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Price versus tokens sold">
          {y.ticks(5).map((t) => (
            <g key={`y${t}`}>
              <line className="grid" x1={M.left} x2={width - M.right} y1={y(t)} y2={y(t)} />
              <text className="tick" x={M.left - 8} y={y(t)} dy="0.32em" textAnchor="end">{fmtPrice(t)}</text>
            </g>
          ))}
          {x.ticks(6).map((t) => (
            <text key={`x${t}`} className="tick" x={x(t)} y={height - M.bottom + 16} textAnchor="middle">{fmtTokens(t)}</text>
          ))}
          {(() => {
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
            return <path key={`a${i}`} className="terrain" d={area} fill={segmentTone(seg[0].segment)} />;
          })}
          {path.slice(1).map((seg, i) => (
            <line key={`b${i}`} className="boundary" x1={x(seg[0].tokens)} x2={x(seg[0].tokens)} y1={y(0)} y2={y(seg[0].price)} />
          ))}
          <path
            className="curve"
            d={all.map((p, j) => `${j ? "L" : "M"}${x(p.tokens).toFixed(1)},${y(p.price).toFixed(1)}`).join("")}
          />
          {all.length > 0 && (
            <g className="graduation" transform={`translate(${x(all.at(-1)!.tokens)},${y(all.at(-1)!.price)})`}>
              <circle r={4} />
              <text x={-8} dy="0.32em" textAnchor="end">graduates · {sol(graduationMcSol)} SOL MC</text>
            </g>
          )}
          <line className="axis" x1={M.left} x2={width - M.right} y1={y(0)} y2={y(0)} />
        </svg>
      )}
    </div>
  );
}
