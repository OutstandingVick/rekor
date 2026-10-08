import { pct, price, sol, tokens } from "../format";
import { segmentTone } from "../palette";
import type { SegmentStat } from "../segmentStats";
import "./table.ts";

export interface SegmentsTableProps {
  stats: SegmentStat[];
  active: number | null;
  onActive: (i: number | null) => void;
}

/** Per-segment breakdown of the designed curve; rows and chart bands highlight together. */
export function SegmentsTable({ stats, active, onActive }: SegmentsTableProps) {
  return (
    <table className="dtable">
      <thead>
        <tr>
          <th>#</th>
          <th>Supply range</th>
          <th>Start price</th>
          <th>End price</th>
          <th>Price Δ</th>
          <th>Liquidity</th>
          <th>SOL in segment</th>
          <th>Cumulative SOL</th>
        </tr>
      </thead>
      <tbody onMouseLeave={() => onActive(null)}>
        {stats.map((s) => (
          <tr key={s.index} className={active === s.index ? "selected" : ""} onMouseEnter={() => onActive(s.index)}>
            <td>
              <span className="swatch-inline" style={{ background: segmentTone(s.index) }} />
              S{s.index + 1}
              {s.graduates && <span className="tag curve">graduates</span>}
            </td>
            <td>{tokens(s.fromTokens)} – {tokens(s.toTokens)}</td>
            <td>{price(s.startPrice)}</td>
            <td>{price(s.endPrice)}</td>
            <td className="up">+{pct(s.priceChange, 1)}</td>
            <td className="dim">{Number(s.liquidity).toExponential(2)}</td>
            <td>{sol(s.segmentSol)}</td>
            <td>{sol(s.cumulativeSol)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
