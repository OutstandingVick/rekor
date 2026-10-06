import { useEffect, useId, useState, type ReactNode } from "react";
import "./fields.css";

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}

/**
 * Keeps its own text so half-typed values ("0.", "") don't fight the model.
 * Only valid numbers within [min, max] are committed; others show as invalid.
 */
export function NumberField({ label, value, onChange, unit, min = -Infinity, max = Infinity, step, hint }: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(show(value));
  useEffect(() => {
    if (parse(text) !== value) setText(show(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  const parsed = parse(text);
  const valid = Number.isFinite(parsed) && parsed >= min && parsed <= max;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className={`input ${valid ? "" : "invalid"}`}>
        <input
          id={id}
          inputMode="decimal"
          value={text}
          step={step}
          aria-invalid={!valid}
          onChange={(e) => {
            setText(e.target.value);
            const v = parse(e.target.value);
            if (Number.isFinite(v) && v >= min && v <= max) onChange(v);
          }}
        />
        {unit && <span className="unit">{unit}</span>}
      </div>
      {!valid ? <div className="hint bad">{rangeText(min, max)}</div> : hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function rangeText(min: number, max: number) {
  if (Number.isFinite(min) && Number.isFinite(max)) return `between ${min} and ${max}`;
  if (Number.isFinite(min)) return `at least ${min}`;
  return `at most ${max}`;
}

/** 1000000000 -> "1,000,000,000"; small and fractional values as typed */
function show(v: number): string {
  return Math.abs(v) >= 10_000 && Number.isInteger(v) ? v.toLocaleString("en-US") : String(v);
}

function parse(text: string): number {
  const t = text.replace(/[,_\s]/g, "");
  return t === "" ? NaN : Number(t);
}
