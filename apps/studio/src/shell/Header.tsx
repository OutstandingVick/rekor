import type { ReactNode } from "react";
import "./header.css";

export function Header({ children }: { children?: ReactNode }) {
  return (
    <header className="topbar">
      <div className="brand">
        <svg className="brand-mark" viewBox="0 0 16 16" aria-hidden="true">
          <path d="M2 13 C7 12 10 9 14 3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <strong>rekor</strong>
        <span className="brand-sub">DBC curve studio</span>
      </div>
      {children}
    </header>
  );
}
