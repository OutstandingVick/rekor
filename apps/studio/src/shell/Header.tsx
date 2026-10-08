import type { ReactNode } from "react";
import "./header.css";

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="brand">
        <img className="brand-mark" src="/rekor-mark.svg" alt="" width={24} height={24} />
        <strong>rekor</strong>
        <span className="brand-sub">DBC curve studio</span>
      </div>
      {children}
    </header>
  );
}
