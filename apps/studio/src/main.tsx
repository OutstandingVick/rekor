import "./polyfills";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { WalletRoot } from "./chain/WalletRoot";
import "./theme.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WalletRoot>
      <App />
    </WalletRoot>
  </StrictMode>,
);
