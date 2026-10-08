import { useState } from "react";
import "./export.css";

export interface ExportBarProps {
  /** null while the design is infeasible: nothing valid to export */
  json: (() => string) | null;
  script: (() => string) | null;
}

const INSTALL = "npm i dbc-curve-sim";

export function ExportBar({ json, script }: ExportBarProps) {
  const [flash, setFlash] = useState<string | null>(null);
  const copy = async (label: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setFlash(label);
    } catch {
      setFlash("copy blocked by browser");
    }
    setTimeout(() => setFlash(null), 1400);
  };
  const download = (text: string) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/typescript" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "init-config.ts" });
    a.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="export">
      <span className="ex-label">Export</span>
      <button type="button" disabled={!json} onClick={() => json && copy("config JSON copied", json())}>
        <Icon d="M5 3h7l3 3v9H5zM8 1H3v11" /> copy config JSON
      </button>
      <button type="button" disabled={!script} onClick={() => script && download(script())}>
        <Icon d="M9 2v9M5 7l4 4 4-4M3 14h12" /> download init script
      </button>
      <button type="button" className="install" onClick={() => copy("install command copied", INSTALL)}>
        <span className="prompt">$</span> <code>{INSTALL}</code>
      </button>
      <span className="flash" role="status">{flash}</span>
      <span className="scope" title="Out of scope: mainnet deploy, migration execution, DAMM v2 pool management, Token-2022 hooks, rate limiter, non-SOL quote">
        SOL quote · DAMM v2 migration · devnet only
      </span>
    </div>
  );
}

function Icon({ d }: { d: string }) {
  return (
    <svg width="12" height="12" viewBox="0 0 18 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}
