import { MODES, type Mode } from "./workflow";

export interface StepperProps {
  mode: Mode;
  onMode: (m: Mode) => void;
  /** stages already satisfied, shown with a check */
  done: Partial<Record<Mode, boolean>>;
}

/** Design → Simulate → Deploy → Verify, as a segmented control. */
export function Stepper({ mode, onMode, done }: StepperProps) {
  return (
    <nav className="stepper" aria-label="Workflow">
      {MODES.map((m, i) => (
        <button
          key={m.id}
          type="button"
          className={`step ${mode === m.id ? "active" : ""} ${done[m.id] ? "done" : ""}`}
          aria-current={mode === m.id ? "step" : undefined}
          onClick={() => onMode(m.id)}
        >
          <span className="step-n">{done[m.id] ? "✓" : i + 1}</span>
          {m.label}
        </button>
      ))}
    </nav>
  );
}
