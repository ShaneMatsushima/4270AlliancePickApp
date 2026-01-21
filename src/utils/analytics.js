import { fetchStatboticsTeamYear } from "./statbotics.js";
import { fetchEventMatches, fetchEventRankings } from "./tba.js";

/**
 * Compute per-team averages from match score_breakdown.
 * NOTE: The exact keys inside score_breakdown are game-specific.
 * You may need to tweak `extractFuel()` / `extractHang()` once you confirm
 * the 2026 REBUILT breakdown field names from TBA match JSON.
 */
function extractFuel(breakdown) {
  if (!breakdown) return 0;

  // Common patterns used by TBA score breakdowns across games:
  // Try a few likely names; adjust once you inspect a real match payload.
  return (
    breakdown.fuel ||
    breakdown.autoFuel ||
    breakdown.teleopFuel ||
    breakdown.totalFuel ||
    0
  );
}

function extractHangPoints(breakdown) {
  if (!breakdown) return 0;
  return (
    breakdown.hangPoints ||
    breakdown.endgameHangPoints ||
    breakdown.endgamePoints ||
    0
  );
}

function matchResultForTeam(match, teamKey) {
  const r = match?.alliances?.red?.team_keys || [];
  const b = match?.alliances?.blue?.team_keys || [];
  const isRed = r.includes(teamKey);
  const isBlue = b.includes(teamKey);
  if (!isRed && !isBlue) return null;

  const redScore = match?.alliances?.red?.score;
  const blueScore = match?.alliances?.blue?.score;
  if (typeof redScore !== "number" || typeof blueScore !== "number") return null;

  const winner =
    redScore === blueScore ? "tie" : redScore > blueScore ? "red" : "blue";

  const myColor = isRed ? "red" : "blue";
  const wl = winner === "tie" ? "T" : winner === myColor ? "W" : "L";

  return { wl, myColor, redScore, blueScore };
}

export async function buildEventAnalytics(eventKey, teams) {
  console.log("📊 Building analytics for event", eventKey);

  // Pull once per event
  const [matches, rankings] = await Promise.all([
    fetchEventMatches(eventKey),
    fetchEventRankings(eventKey),
  ]);

  // Build ranking lookup: teamKey -> rank info
  const rankMap = new Map();
  try {
    const rows = rankings?.rankings || [];
    for (const row of rows) {
      // row.team_key like "frc4270"
      rankMap.set(row.team_key, {
        rank: row.rank,
        record: row.record || null, // sometimes includes wins/losses/ties
        dq: row.dq,
        matches_played: row.matches_played,
      });
    }
  } catch (e) {
    console.log("⚠️ Rankings parse issue", e);
  }

  // Pre-split matches that are played and have score breakdowns
  const played = (matches || []).filter(
    (m) => m?.actual_time && m?.score_breakdown
  );

  const analyticsByTeamKey = {};

  for (const t of teams) {
    const teamKey = t.key; // "frcXXXX"
    const teamNumber = t.team_number;

    // Statbotics (EPA)
    let sb = null;
    try {
      sb = await fetchStatboticsTeamYear(teamNumber, 2026);
    } catch (e) {
      console.log("⚠️ Statbotics failed for", teamNumber, e?.message || e);
    }

    // TBA derived stats from matches
    let fuelSum = 0;
    let hangSum = 0;
    let n = 0;
    const recent = [];

    for (const m of played) {
      const r = matchResultForTeam(m, teamKey);
      if (!r) continue;

      const breakdown = m.score_breakdown?.[r.myColor];
      fuelSum += extractFuel(breakdown);
      hangSum += extractHangPoints(breakdown);
      n += 1;

      // recent matches list
      recent.push({
        matchKey: m.key,
        compLevel: m.comp_level,
        setNumber: m.set_number,
        matchNumber: m.match_number,
        wl: r.wl,
        score: r.myColor === "red" ? `${r.redScore}-${r.blueScore}` : `${r.blueScore}-${r.redScore}`,
      });
    }

    recent.sort((a, b) => {
      // rough sort by match number; good enough for display
      return (b.matchNumber || 0) - (a.matchNumber || 0);
    });

    analyticsByTeamKey[teamKey] = {
      rank: rankMap.get(teamKey)?.rank ?? null,
      wl: rankMap.get(teamKey)?.record ?? null,
      matches_played: rankMap.get(teamKey)?.matches_played ?? n,
      avgFuel: n ? fuelSum / n : 0,
      avgHang: n ? hangSum / n : 0,
      epa: sb?.epa?.total ?? sb?.epa_total ?? null,
      epaBreakdown: sb?.epa ?? null,
      recent: recent.slice(0, 5),
    };
  }

  console.log("✅ Analytics built for teams:", Object.keys(analyticsByTeamKey).length);
  return analyticsByTeamKey;
}
