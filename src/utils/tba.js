console.log("✅ tba.js loaded");

const TBA_BASE = "https://www.thebluealliance.com/api/v3";

/**
 * Normalize user input:
 * - If user types "HIHO", convert to "2026hiho" (current year + lowercase)
 * - If user types "2026hiho", leave it alone
 */
export function normalizeEventKey(input) {
  const raw = String(input || "").trim();
  if (!raw) return "";

  // already has digits at front? assume full event key
  if (/^\d{4}[a-z0-9_]+$/i.test(raw)) return raw.toLowerCase();

  // otherwise assume code only (ex: HIHO)
  const year = new Date().getFullYear();
  return `${year}${raw}`.toLowerCase();
}

export async function fetchEventTeamsSimple(eventKey) {
  const key = import.meta.env.VITE_TBA_AUTH_KEY;
  if (!key) {
    throw new Error("Missing VITE_TBA_AUTH_KEY in .env");
  }

  const url = `${TBA_BASE}/event/${encodeURIComponent(eventKey)}/teams/simple`;
  console.log(`🌐 TBA fetch: ${url}`);

  const res = await fetch(url, {
    headers: {
      "X-TBA-Auth-Key": key, // required
      "User-Agent": "kanban-board (dev)", // sometimes helpful to avoid 403s in some stacks
    },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`TBA error ${res.status} ${res.statusText} — ${text.slice(0, 200)}`);
  }

  const data = await res.json();
  console.log(`✅ TBA teams returned: ${Array.isArray(data) ? data.length : "?"}`);
  return data;
}
