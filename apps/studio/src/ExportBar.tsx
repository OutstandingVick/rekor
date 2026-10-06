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
      <button type="button" disabled={!json} onClick={() => json && copy("config JSON copied", json())}>copy config JSON</button>
      <button type="button" disabled={!script} onClick={() => script && download(script())}>download init script</button>
      <button type="button" className="install" onClick={() => copy("install command copied", INSTALL)}>
        <code>{INSTALL}</code>
      </button>
      <span className="flash" role="status">{flash}</span>
    </div>
  );
}
