import { useEffect, useState } from "react";
import type { Analysis } from "../analysis";
import type { Deployment } from "./deploy";
import { devnet } from "./network";
import { verifyDeployment, type Verification } from "./verify";

/** Reads the deployed config back from chain whenever the deployment (or its solved design) changes. */
export function useVerification(deployment: Deployment | null, analysis: Analysis): Verification | "checking" | null {
  const [check, setCheck] = useState<Verification | "checking" | null>(null);
  useEffect(() => {
    if (!deployment || !analysis.ok) return setCheck(null);
    setCheck("checking");
    let alive = true;
    devnet()
      .then((c) => verifyDeployment(c, deployment, analysis.solved))
      .then((v) => alive && setCheck(v))
      .catch(() => alive && setCheck(null));
    return () => {
      alive = false;
    };
  }, [deployment, analysis]);
  return check;
}
