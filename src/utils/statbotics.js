const SB_BASE = "https://api.statbotics.io/v3";

/**
 * Get a team season summary (EPA, etc.)
 * Example: /team_year/4270/2026
 */
export async function fetchStatboticsTeamYear(teamNumber, year) {
  const url = `${SB_BASE}/team_year/${teamNumber}/${year}`;
  console.log("📡 Statbotics GET", url);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Statbotics error ${res.status}`);
  return res.json();
}
