import type { ReactNode } from "react";
import "./header.css";

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="brand">
        <img className="brand-logo" src="/rekor-logo.png" alt="Rekor" height={26} />
        <span className="brand-sub">DBC curve studio</span>
      </div>
      {children}
    </header>
  );
}
