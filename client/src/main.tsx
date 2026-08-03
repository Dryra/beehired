import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { installRootExtensionBridge } from "./rootExtensionBridge";

// Start listening before React renders so extension messages sent during
// application hydration are buffered rather than lost.
installRootExtensionBridge();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
