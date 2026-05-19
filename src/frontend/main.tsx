import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/frontend/app/App";
import "@/frontend/styles/tokens.css";
import "@/frontend/styles/reset.css";
import "@/frontend/styles/app.css";
import "@/frontend/styles/grid.css";
import "@/frontend/styles/cells.css";
import "@/frontend/styles/modal.css";
import "@/frontend/styles/login.css";
import "@/frontend/styles/calendar.css";
import "@/frontend/styles/reports.css";
import "@/frontend/styles/admin.css";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("#root element not found");

createRoot(rootEl).render(
  <StrictMode>
    <App />
  </StrictMode>
);
