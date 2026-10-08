import type { DeployState } from "./chain/useDeployment";

type StepState = "todo" | "active" | "done" | "failed";

/** Two on-chain steps of a deploy and where each one stands. */
export function DeploySteps({ state }: { state: DeployState }) {
  const s = (step: "config" | "pool"): StepState => {
    if (state.kind === "deployed") return "done";
    if (state.kind === "deploying") {
      if (state.step === step) return "active";
      return step === "config" ? "done" : "todo";
    }
    if (state.kind === "error") return "failed";
    return "todo";
  };
  const steps = [
    { id: "config" as const, label: "Create config", sub: "your curve, fees and migration settings" },
    { id: "pool" as const, label: "Create pool", sub: "SOL-quoted pool + token mint on that config" },
  ];
  return (
    <ol className="deploy-steps">
      {steps.map((st, i) => (
        <li key={st.id} className={`ds-${s(st.id)}`}>
          <span className="ds-n">{s(st.id) === "done" ? "✓" : s(st.id) === "failed" ? "!" : i + 1}</span>
          <div>
            <strong>{st.label}</strong>
            <span>{st.sub}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}
