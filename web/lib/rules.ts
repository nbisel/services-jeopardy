import type { Entry, ResultCode } from "./types";

// Monday-first, matching the tear-off calendar week.
export const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DAY_ABBREV = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

export const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

export const DAY_VALUES = [200, 600, 1000, 400, 1200, 2000, 0] as const;

export const MAX_NAME_LENGTH = 30;

/** How many days ahead of today an entry may be logged. */
export const MAX_FUTURE_DAYS = 2;

// --- Date helpers (all local-time, YYYY-MM-DD strings) ---

export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function addDaysStr(s: string, n: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

/** Weekday index, Monday = 0 … Sunday = 6. */
export function weekdayMon0(s: string): number {
  return (parseDateStr(s).getDay() + 6) % 7;
}

/** Monday of the week containing the given date. */
export function weekStartStr(s: string): string {
  return addDaysStr(s, -weekdayMon0(s));
}

export function isSunday(s: string): boolean {
  return weekdayMon0(s) === 6;
}

export function dayName(s: string): string {
  return DAY_NAMES[weekdayMon0(s)];
}

export function dayValue(s: string): number {
  return DAY_VALUES[weekdayMon0(s)];
}

export function maxEntryDateStr(): string {
  return addDaysStr(todayStr(), MAX_FUTURE_DAYS);
}

export function formatDateLong(s: string): string {
  return parseDateStr(s).toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

// --- Scoring ---

export function computeAmount(
  result: "correct" | "incorrect" | "pass",
  value: number
): number {
  if (result === "correct") return value;
  if (result === "incorrect") return -value;
  return 0;
}

export function isCorrect(result: ResultCode): boolean {
  return result === "correct" || result === "correct_wager";
}

export function isIncorrect(result: ResultCode): boolean {
  return result === "incorrect" || result === "incorrect_wager";
}

/**
 * Sunday wager cap: the absolute value of the player's Mon–Sat total
 * for the week containing `date` (entries strictly before `date`).
 */
export function maxWager(entries: Entry[], playerId: string, date: string): number {
  const start = weekStartStr(date);
  const total = entries
    .filter((e) => e.player_id === playerId && e.date >= start && e.date < date)
    .reduce((sum, e) => sum + e.amount, 0);
  return Math.abs(total);
}

/**
 * How many of the week's six Mon–Sat dates (strictly before the given
 * Sunday date) already have an entry for this player. Used to warn when
 * a wager cap may be computed from an incomplete week.
 */
export function weekdaysLoggedCount(
  entries: Entry[],
  playerId: string,
  date: string
): number {
  const start = weekStartStr(date);
  const logged = new Set(
    entries
      .filter((e) => e.player_id === playerId && e.date >= start && e.date < date)
      .map((e) => e.date)
  );
  return logged.size;
}

export function fmtMoney(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}$${Math.abs(n).toLocaleString()}`;
}
