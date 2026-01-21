import React, { useEffect, useMemo, useState } from "react";

console.log("✅ AuthGate.jsx loaded");

const SESSION_KEY = "kanban_unlocked_session_v1";
const PASS_HASH_KEY = "kanban_pass_hash_v1";
const DEFAULT_PASSWORD = "4270";

function fnv1aHash(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return `fnv1a_${h.toString(16)}`;
}

function getStoredHash() {
  const raw = localStorage.getItem(PASS_HASH_KEY);
  if (raw) return raw;

  const defaultHash = fnv1aHash(DEFAULT_PASSWORD);
  localStorage.setItem(PASS_HASH_KEY, defaultHash);
  console.log(`🔐 Default password initialized = "${DEFAULT_PASSWORD}"`);
  return defaultHash;
}

export default function AuthGate({ children }) {
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  const storedHash = useMemo(() => getStoredHash(), []);

  useEffect(() => {
    const isUnlocked = sessionStorage.getItem(SESSION_KEY) === "true";
    if (isUnlocked) {
      console.log("🔓 Session already unlocked.");
      setUnlocked(true);
    } else {
      console.log("🔒 Session locked.");
    }
  }, []);

  const doUnlock = (e) => {
    e.preventDefault();
    setMsg("");

    console.log("🔐 Unlock attempt...");

    if (fnv1aHash(password) === storedHash) {
      console.log("✅ Unlock success.");
      sessionStorage.setItem(SESSION_KEY, "true");
      setUnlocked(true);
      setPassword("");
      return;
    }

    console.log("❌ Unlock failed.");
    setMsg("Wrong password.");
  };

  if (unlocked) {
    return <>{children}</>;
  }

  // Lock screen only
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 16,
      }}
    >
      <div
        style={{
          width: "min(520px, 100%)",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(20,20,28,0.72)",
          boxShadow: "0 20px 60px rgba(0,0,0,0.45)",
          padding: 18,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,0.08)",
              border: "1px solid rgba(255,255,255,0.12)",
              fontSize: 20,
            }}
          >
            🔐
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 18 }}>Locked</div>
            <div style={{ opacity: 0.75, fontSize: 12 }}>Enter password to open the board</div>
          </div>
        </div>

        <form onSubmit={doUnlock} style={{ display: "grid", gap: 10 }}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            style={inputStyle}
            autoFocus
          />

          {msg ? <div style={{ color: "rgba(255,180,180,0.95)", fontSize: 13 }}>{msg}</div> : null}

          <button className="btn" type="submit">
            Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.92)",
  outline: "none",
};
