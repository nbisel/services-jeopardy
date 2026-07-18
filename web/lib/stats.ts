import type { Entry, ResultCode } from "./types";
import {
  addDaysStr,
  isCorrect,
  isIncorrect,
  weekdayMon0,
  weekStartStr,
} from "./rules";

/** Entries sorted by date ascending, grouped per player name. */
function byPlayer(entries: Entry[]): Map<string, Entry[]> {
  const map = new Map<string, Entry[]>();
  for (const e of entries) {
    const list = map.get(e.player);
    if (list) list.push(e);
    else map.set(e.player, [e]);
  }
  for (const list of map.values()) list.sort((a, b) => a.date.localeCompare(b.date));
  return map;
}

// --- Leaderboards ---

export type WeekRow = {
  player: string;
  cells: (ResultCode | null)[]; // Mon..Sun
  total: number;
};

export function weeklyRows(entries: Entry[], weekStart: string): WeekRow[] {
  const weekEnd = addDaysStr(weekStart, 7);
  const inWeek = entries.filter((e) => e.date >= weekStart && e.date < weekEnd);
  const rows = new Map<string, WeekRow>();
  for (const e of inWeek) {
    let row = rows.get(e.player);
    if (!row) {
      row = { player: e.player, cells: Array(7).fill(null), total: 0 };
      rows.set(e.player, row);
    }
    row.cells[weekdayMon0(e.date)] = e.result;
    row.total += e.amount;
  }
  return [...rows.values()].sort((a, b) => b.total - a.total);
}

export function monthlyTotals(
  entries: Entry[],
  year: number,
  month: number // 1-12
): { player: string; total: number }[] {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const totals = new Map<string, number>();
  for (const e of entries) {
    if (e.date.startsWith(prefix)) {
      totals.set(e.player, (totals.get(e.player) ?? 0) + e.amount);
    }
  }
  return [...totals.entries()]
    .map(([player, total]) => ({ player, total }))
    .sort((a, b) => b.total - a.total);
}

export type AnnualRow = { player: string; months: (number | null)[]; ytd: number };

export function annualPivot(
  entries: Entry[],
  year: number,
  currentMonth: number // 1-12; months after this show null
): AnnualRow[] {
  const rows = new Map<string, AnnualRow>();
  for (const e of entries) {
    if (!e.date.startsWith(`${year}-`)) continue;
    const m = Number(e.date.slice(5, 7));
    let row = rows.get(e.player);
    if (!row) {
      row = {
        player: e.player,
        months: Array.from({ length: 12 }, (_, i) => (i < currentMonth ? 0 : null)),
        ytd: 0,
      };
      rows.set(e.player, row);
    }
    row.months[m - 1] = (row.months[m - 1] ?? 0) + e.amount;
    row.ytd += e.amount;
  }
  return [...rows.values()].sort((a, b) => b.ytd - a.ytd);
}

// --- Streaks ---

export type Streak = { player: string; current: number; longest: number };

/**
 * A streak is consecutive played entries (by date order) answered correctly.
 * Incorrect answers, lost wagers, and passes break it; unplayed days don't.
 */
export function streaks(entries: Entry[]): Streak[] {
  const result: Streak[] = [];
  for (const [player, list] of byPlayer(entries)) {
    let current = 0;
    let longest = 0;
    for (const e of list) {
      current = isCorrect(e.result) ? current + 1 : 0;
      longest = Math.max(longest, current);
    }
    result.push({ player, current, longest });
  }
  return result.sort((a, b) => b.current - a.current || b.longest - a.longest);
}

// --- Records / hall of fame ---

export type GameRecord = {
  label: string;
  player: string;
  detail: string;
  emoji: string;
};

export function records(entries: Entry[]): GameRecord[] {
  if (entries.length === 0) return [];
  const out: GameRecord[] = [];
  const fmt = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(n).toLocaleString()}`;
  const pretty = (date: string) => {
    const [y, m, d] = date.split("-").map(Number);
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const best = entries.reduce((a, b) => (b.amount > a.amount ? b : a));
  out.push({
    label: "Biggest single day",
    player: best.player,
    detail: `${fmt(best.amount)} on ${pretty(best.date)}`,
    emoji: "💰",
  });

  const wagers = entries.filter((e) => e.result.endsWith("_wager"));
  if (wagers.length > 0) {
    const win = wagers.reduce((a, b) => (b.amount > a.amount ? b : a));
    if (win.amount > 0) {
      out.push({
        label: "Boldest Sunday win",
        player: win.player,
        detail: `${fmt(win.amount)} wagered and won, ${pretty(win.date)}`,
        emoji: "🎲",
      });
    }
    const loss = wagers.reduce((a, b) => (b.amount < a.amount ? b : a));
    if (loss.amount < 0) {
      out.push({
        label: "Most painful Sunday",
        player: loss.player,
        detail: `${fmt(loss.amount)} on ${pretty(loss.date)}`,
        emoji: "💥",
      });
    }
  }

  // Best week (Mon–Sun sum) per player-week
  const weekTotals = new Map<string, { player: string; week: string; total: number }>();
  for (const e of entries) {
    const week = weekStartStr(e.date);
    const key = `${e.player}|${week}`;
    const cur = weekTotals.get(key) ?? { player: e.player, week, total: 0 };
    cur.total += e.amount;
    weekTotals.set(key, cur);
  }
  const bestWeek = [...weekTotals.values()].reduce((a, b) => (b.total > a.total ? b : a));
  out.push({
    label: "Best week ever",
    player: bestWeek.player,
    detail: `${fmt(bestWeek.total)} in the week of ${pretty(bestWeek.week)}`,
    emoji: "🏆",
  });

  // Perfect weeks: all six Mon–Sat entries present and correct
  const perfect = new Map<string, number>();
  const weekEntries = new Map<string, Entry[]>();
  for (const e of entries) {
    if (weekdayMon0(e.date) === 6) continue;
    const key = `${e.player}|${weekStartStr(e.date)}`;
    const list = weekEntries.get(key) ?? [];
    list.push(e);
    weekEntries.set(key, list);
  }
  for (const [key, list] of weekEntries) {
    if (list.length === 6 && list.every((e) => isCorrect(e.result))) {
      const player = key.split("|")[0];
      perfect.set(player, (perfect.get(player) ?? 0) + 1);
    }
  }
  if (perfect.size > 0) {
    const [player, count] = [...perfect.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
    out.push({
      label: "Perfect weeks (Mon–Sat all correct)",
      player,
      detail: `${count} perfect week${count === 1 ? "" : "s"}`,
      emoji: "✨",
    });
  }

  // Biggest comeback: largest climb from a player's in-month low back up
  let comeback: { player: string; climb: number; month: string } | null = null;
  const byPlayerMonth = new Map<string, Entry[]>();
  for (const e of entries) {
    const key = `${e.player}|${e.date.slice(0, 7)}`;
    const list = byPlayerMonth.get(key) ?? [];
    list.push(e);
    byPlayerMonth.set(key, list);
  }
  for (const [key, list] of byPlayerMonth) {
    list.sort((a, b) => a.date.localeCompare(b.date));
    let cum = 0;
    let low = 0;
    let climb = 0;
    for (const e of list) {
      cum += e.amount;
      low = Math.min(low, cum);
      climb = Math.max(climb, cum - low);
    }
    const [player, month] = key.split("|");
    if (low < 0 && (!comeback || climb > comeback.climb)) {
      comeback = { player, climb, month };
    }
  }
  if (comeback && comeback.climb > 0) {
    const [y, m] = comeback.month.split("-").map(Number);
    const monthName = new Date(y, m - 1, 1).toLocaleDateString(undefined, {
      month: "long",
      year: "numeric",
    });
    out.push({
      label: "Biggest comeback",
      player: comeback.player,
      detail: `Climbed ${fmt(comeback.climb)} from their low in ${monthName}`,
      emoji: "📈",
    });
  }

  const passes = new Map<string, number>();
  for (const e of entries) {
    if (e.result === "pass") passes.set(e.player, (passes.get(e.player) ?? 0) + 1);
  }
  if (passes.size > 0) {
    const [player, count] = [...passes.entries()].reduce((a, b) => (b[1] > a[1] ? b : a));
    out.push({
      label: "Most strategic passes",
      player,
      detail: `${count} pass${count === 1 ? "" : "es"}`,
      emoji: "🤔",
    });
  }

  return out;
}

// --- Head to head ---

export type HeadToHead = {
  daysBothPlayed: number;
  aWins: number;
  bWins: number;
  ties: number;
  aTotal: number;
  bTotal: number;
  aWinRate: number | null;
  bWinRate: number | null;
};

function winRate(list: Entry[]): number | null {
  const answered = list.filter((e) => isCorrect(e.result) || isIncorrect(e.result));
  if (answered.length === 0) return null;
  return list.filter((e) => isCorrect(e.result)).length / answered.length;
}

export function headToHead(entries: Entry[], a: string, b: string): HeadToHead {
  const aList = entries.filter((e) => e.player === a);
  const bList = entries.filter((e) => e.player === b);
  const aByDate = new Map(aList.map((e) => [e.date, e]));
  let daysBothPlayed = 0;
  let aWins = 0;
  let bWins = 0;
  let ties = 0;
  for (const eb of bList) {
    const ea = aByDate.get(eb.date);
    if (!ea) continue;
    daysBothPlayed++;
    if (ea.amount > eb.amount) aWins++;
    else if (eb.amount > ea.amount) bWins++;
    else ties++;
  }
  return {
    daysBothPlayed,
    aWins,
    bWins,
    ties,
    aTotal: aList.reduce((s, e) => s + e.amount, 0),
    bTotal: bList.reduce((s, e) => s + e.amount, 0),
    aWinRate: winRate(aList),
    bWinRate: winRate(bList),
  };
}

// --- Chart data ---

export type RacePoint = { day: number } & Record<string, number>;

/** Cumulative score per player across a month; series limited to `maxSeries` by final total. */
export function raceData(
  entries: Entry[],
  year: number,
  month: number,
  maxSeries = 8
): { data: RacePoint[]; series: string[] } {
  const prefix = `${year}-${String(month).padStart(2, "0")}`;
  const monthEntries = entries.filter((e) => e.date.startsWith(prefix));
  if (monthEntries.length === 0) return { data: [], series: [] };

  const totals = new Map<string, number>();
  for (const e of monthEntries) totals.set(e.player, (totals.get(e.player) ?? 0) + e.amount);
  const series = [...totals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxSeries)
    .map(([p]) => p)
    .sort(); // fixed alphabetical order so colors stay stable

  const lastDay = Math.max(...monthEntries.map((e) => Number(e.date.slice(8, 10))));
  const cum = new Map(series.map((p) => [p, 0]));
  const data: RacePoint[] = [];
  for (let day = 1; day <= lastDay; day++) {
    const dstr = `${prefix}-${String(day).padStart(2, "0")}`;
    for (const e of monthEntries) {
      if (e.date === dstr && cum.has(e.player)) {
        cum.set(e.player, cum.get(e.player)! + e.amount);
      }
    }
    const point: RacePoint = { day } as RacePoint;
    for (const p of series) point[p] = cum.get(p)!;
    data.push(point);
  }
  return { data, series };
}

export type WeekdayRate = {
  day: string;
  rate: number; // 0-100
  correct: number;
  answered: number;
  best: string | null;
};

/** Team-wide correct rate per weekday, Mon–Sat (passes excluded from the denominator). */
export function weekdayWinRates(entries: Entry[]): WeekdayRate[] {
  const abbrev = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return abbrev.map((day, i) => {
    const dayEntries = entries.filter(
      (e) => weekdayMon0(e.date) === i && (isCorrect(e.result) || isIncorrect(e.result))
    );
    const correct = dayEntries.filter((e) => isCorrect(e.result)).length;

    const perPlayer = new Map<string, { c: number; n: number }>();
    for (const e of dayEntries) {
      const cur = perPlayer.get(e.player) ?? { c: 0, n: 0 };
      cur.n++;
      if (isCorrect(e.result)) cur.c++;
      perPlayer.set(e.player, cur);
    }
    let best: string | null = null;
    let bestRate = -1;
    for (const [p, { c, n }] of perPlayer) {
      if (n >= 3 && c / n > bestRate) {
        bestRate = c / n;
        best = p;
      }
    }

    return {
      day,
      rate: dayEntries.length ? Math.round((correct / dayEntries.length) * 100) : 0,
      correct,
      answered: dayEntries.length,
      best,
    };
  });
}

export type WagerProfile = {
  player: string;
  avgRiskPct: number; // average wager as % of max available
  winRate: number; // 0-100
  count: number;
};

export function wagerProfiles(entries: Entry[]): WagerProfile[] {
  const out: WagerProfile[] = [];
  for (const [player, list] of byPlayer(entries)) {
    const wagers = list.filter((e) => e.result.endsWith("_wager") && e.wager !== null);
    if (wagers.length === 0) continue;
    const riskPcts: number[] = [];
    for (const w of wagers) {
      // Max available at the time = the player's Mon–Sat total for that week
      const start = weekStartStr(w.date);
      const weekTotal = Math.abs(
        list
          .filter((e) => e.date >= start && e.date < w.date)
          .reduce((s, e) => s + e.amount, 0)
      );
      if (weekTotal > 0) riskPcts.push((100 * (w.wager ?? 0)) / weekTotal);
    }
    if (riskPcts.length === 0) continue;
    out.push({
      player,
      avgRiskPct: Math.round(riskPcts.reduce((a, b) => a + b, 0) / riskPcts.length),
      winRate: Math.round(
        (100 * wagers.filter((e) => isCorrect(e.result)).length) / wagers.length
      ),
      count: wagers.length,
    });
  }
  return out.sort((a, b) => b.avgRiskPct - a.avgRiskPct);
}
