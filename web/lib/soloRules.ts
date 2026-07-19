/**
 * Solo Trivia rules — the free-play mode backed by the Open Trivia DB pool.
 * Deliberately flat: one value per clue, no weekday tiering, no wagers.
 */

/** Flat value awarded for every Solo Trivia clue (correct +, incorrect −, pass 0). */
export const SOLO_CLUE_VALUE = 500;

/**
 * "Today" in the team's timezone (US Central), as a YYYY-MM-DD string.
 * The daily-assignment cron runs in UTC, but a clue must land on the same
 * calendar date players see, so the date is always computed in Central.
 */
export const SOLO_TIMEZONE = "America/Chicago";

export function soloDateStr(d: Date = new Date()): string {
  // en-CA formats as YYYY-MM-DD; timeZone pins it to Central regardless of host.
  return new Intl.DateTimeFormat("en-CA", { timeZone: SOLO_TIMEZONE }).format(d);
}
