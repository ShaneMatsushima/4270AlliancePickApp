import React from "react";
import AuthGate from "./components/AuthGate.jsx";
import App from "./App.jsx";

console.log("✅ AppShell.jsx loaded");

export default function AppShell() {
  return (
    <AuthGate>
      <App />
    </AuthGate>
  );
}
