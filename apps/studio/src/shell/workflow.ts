/** The four stages the right panel switches between. Order is the intended workflow. */
export type Mode = "design" | "simulate" | "deploy" | "verify";

export const MODES: { id: Mode; label: string }[] = [
  { id: "design", label: "Design" },
  { id: "simulate", label: "Simulate" },
  { id: "deploy", label: "Deploy" },
  { id: "verify", label: "Verify" },
];
