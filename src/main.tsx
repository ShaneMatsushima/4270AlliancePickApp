import React from "react";
import ReactDOM from "react-dom/client";
import AppShell from "./AppShell.jsx";
import "./index.css";

console.log("✅ main.jsx loaded (AuthGate enabled)");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>
);
