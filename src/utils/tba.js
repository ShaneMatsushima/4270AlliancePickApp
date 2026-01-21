const TBA_BASE = "https://www.thebluealliance.com/api/v3";

// ⚠️ Client-side key will be visible in browser builds.
// Prefer proxying in Vercel/Netlify later.
const TBA_KEY = import.meta.env.VITE_TBA_AUTH_KEY;

async function tbaGet(path) {
  const url = `${TBA_BASE}${path}`;
  console.log("📡 TBA GET", url);
  const res = await fetch(url, {
    headers: { "X-TBA-Auth-Key": TBA_KEY },
  });
  if (!res.ok) throw new Error(`TBA error ${res.status} for ${path}`);
  return res.json();
}

export function normalizeEventKey(input) {
  if (!input) return "";
  const s = String(input).trim().toLowerCase();
  // Accept "2026hiho" or "hiho" -> assume 2026
  if (/^\d{4}[a-z0-9]+$/.test(s)) return s;
  if (/^[a-z0-9]+$/.test(s)) return `2026${s}`;
  return "";
}

export async function fetchEventTeamsSimple(eventKey) {
  return tbaGet(`/event/${eventKey}/teams/simple`);
}

export async function fetchEventRankings(eventKey) {
  return tbaGet(`/event/${eventKey}/rankings`);
}

export async function fetchTeamEventStatus(teamKey, eventKey) {
  // teamKey like "frc4270"
  return tbaGet(`/team/${teamKey}/event/${eventKey}/status`);
}

export async function fetchEventMatches(eventKey) {
  // includes score_breakdown for 2026 matches
  return tbaGet(`/event/${eventKey}/matches`);
}
