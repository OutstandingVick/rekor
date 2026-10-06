import { MAX_CURVE_POINT } from "dbc-curve-sim";
import { segmentTone } from "./palette";
import { PRESETS } from "./presets";
import "./segments.css";

export interface SegmentEditorProps {
  weights: number[];
  onChange: (weights: number[]) => void;
}

const MAX_WEIGHT = 10;

/** One slider per segment. Weight is relative depth: higher = price moves slower there. */
export function SegmentEditor({ weights, onChange }: SegmentEditorProps) {
  const total = weights.reduce((a, b) => a + b, 0);
  const setAt = (i: number, w: number) => onChange(weights.map((x, j) => (j === i ? w : x)));
  return (
    <div className="segments">
      <div className="segments-head">
        <span>{weights.length} segment{weights.length === 1 ? "" : "s"}</span>
        <span className="buttons">
          <button type="button" disabled={weights.length <= 1} onClick={() => onChange(weights.slice(0, -1))} aria-label="Remove segment">−</button>
          <button type="button" disabled={weights.length >= MAX_CURVE_POINT} onClick={() => onChange([...weights, weights.at(-1) ?? 1])} aria-label="Add segment">+</button>
        </span>
      </div>
      <div className="presets" role="group" aria-label="Shape presets">
        {PRESETS.map((p) => (
          <button key={p.name} type="button" title={p.hint} onClick={() => onChange(p.weights(weights.length))}>
            {p.name}
          </button>
        ))}
      </div>
      <ol>
        {weights.map((w, i) => (
          <li key={i}>
            <span className="swatch" style={{ background: segmentTone(i) }} />
            <span className="idx">{i + 1}</span>
            <input
              type="range"
              min={0.1}
              max={MAX_WEIGHT}
              step={0.1}
              value={w}
              aria-label={`Segment ${i + 1} depth`}
              onChange={(e) => setAt(i, Number(e.target.value))}
            />
            <span className="share">{Math.round((w / total) * 100)}%</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
