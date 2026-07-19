import type { Entry, Player } from "./types";
import { addDaysStr } from "./rules";

/**
 * For each given player, the dates in [start, end) with no entry at all.
 * All 7 weekdays count as playable — Sunday is not special-cased out.
 * Callers decide which players to pass (typically active only) and should
 * clamp `end` so future dates aren't reported as missing.
 */
export function missingForRange(
  players: Player[],
  entries: Entry[],
  start: string,
  end: string
): Map<string, string[]> {
  const logged = new Set(entries.map((e) => `${e.player_id}|${e.date}`));
  const out = new Map<string, string[]>();
  for (const p of players) {
    const missing: string[] = [];
    for (let d = start; d < end; d = addDaysStr(d, 1)) {
      if (!logged.has(`${p.id}|${d}`)) missing.push(d);
    }
    out.set(p.id, missing);
  }
  return out;
}
