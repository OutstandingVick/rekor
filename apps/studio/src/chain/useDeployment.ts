import { useCallback, useState } from "react";
import type { Deployment, DeployStep } from "./deploy";

export type DeployState =
  | { kind: "idle" }
  | { kind: "deploying"; step: DeployStep }
  | { kind: "deployed"; deployment: Deployment }
  | { kind: "error"; message: string };

const KEY = "rekor.deployment.v1";

function load(): DeployState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { kind: "deployed", deployment: JSON.parse(raw) as Deployment };
  } catch {
    // storage blocked or corrupt: start fresh
  }
  return { kind: "idle" };
}

function save(d: Deployment | null) {
  try {
    if (d) localStorage.setItem(KEY, JSON.stringify(d));
    else localStorage.removeItem(KEY);
  } catch {
    // per-browser convenience only; the deployment itself lives on chain
  }
}

/** Deploy lifecycle, remembered in this browser so a reload keeps the live pool. */
export function useDeployment() {
  const [state, setState] = useState<DeployState>(load);
  const begin = useCallback((step: DeployStep) => setState({ kind: "deploying", step }), []);
  const done = useCallback((deployment: Deployment) => {
    save(deployment);
    setState({ kind: "deployed", deployment });
  }, []);
  const fail = useCallback((message: string) => setState({ kind: "error", message }), []);
  const reset = useCallback(() => {
    save(null);
    setState({ kind: "idle" });
  }, []);
  return { state, begin, done, fail, reset };
}
