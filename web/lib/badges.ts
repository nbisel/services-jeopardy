import type { Entry } from "./types";
import { addDaysStr, fmtMoney, isCorrect, isIncorrect, weekStartStr } from "./rules";

/**
 * Shared per-player aggregates for a [start, end) date range.
 * Monthly badges and the yearly Hall of Champions both consume this —
 * one awards engine, two windows.
 */
export type RangeAggregate = {
  player: string;
  total: number;
  correct: number;
  incorrect: number;
  passes: number;
  /** correct + incorrect — passes excluded. */
  answered: number;
  /** Total entries logged in the range, regardless of result. */
  entryCount: number;
  /** Longest run of consecutive correct answers within the range (date order). */
  longestStreak: number;
  wagerCount: number;
  wagerWins: number;
  /** null until the player has at least one wager with a positive bankroll. */
  avgRiskPct: number | null;
  daysPlayed: number;
  /** Longest run of consecutive calendar days with an entry, within the range. */
  consecutiveDaysPlayed: number;
};

export function computeAwardsForRange(
  entries: Entry[],
  start: string,
  end: string
): Map<string, RangeAggregate> {
  const inRange = new Map<string, Entry[]>();
  for (const e of entries) {
    if (e.date < start || e.date >= end) continue;
    const list = inRange.get(e.player);
    if (list) list.push(e);
    else inRange.set(e.player, [e]);
  }

  const out = new Map<string, RangeAggregate>();
  for (const [player, list] of inRange) {
    list.sort((a, b) => a.date.localeCompare(b.date));

    let total = 0;
    let correct = 0;
    let incorrect = 0;
    let passes = 0;
    let streak = 0;
    let longestStreak = 0;
    let wagerCount = 0;
    let wagerWins = 0;
    const riskPcts: number[] = [];
    let daysRun = 0;
    let consecutiveDaysPlayed = 0;
    let prevDate: string | null = null;

    for (const e of list) {
      total += e.amount;
      if (isCorrect(e.result)) correct++;
      else if (isIncorrect(e.result)) incorrect++;
      else passes++;

      streak = isCorrect(e.result) ? streak + 1 : 0;
      longestStreak = Math.max(longestStreak, streak);

      if (e.result.endsWith("_wager")) {
        wagerCount++;
        if (isCorrect(e.result)) wagerWins++;
        if (e.wager !== null) {
          const ws = weekStartStr(e.date);
          const bankroll = Math.abs(
            list
              .filter((x) => x.date >= ws && x.date < e.date)
              .reduce((s, x) => s + x.amount, 0)
          );
          if (bankroll > 0) riskPcts.push((100 * e.wager) / bankroll);
        }
      }

      daysRun = prevDate !== null && addDaysStr(prevDate, 1) === e.date ? daysRun + 1 : 1;
      consecutiveDaysPlayed = Math.max(consecutiveDaysPlayed, daysRun);
      prevDate = e.date;
    }

    out.set(player, {
      player,
      total,
      correct,
      incorrect,
      passes,
      answered: correct + incorrect,
      entryCount: list.length,
      longestStreak,
      wagerCount,
      wagerWins,
      avgRiskPct:
        riskPcts.length > 0
          ? Math.round(riskPcts.reduce((a, b) => a + b, 0) / riskPcts.length)
          : null,
      daysPlayed: new Set(list.map((e) => e.date)).size,
      consecutiveDaysPlayed,
    });
  }
  return out;
}

// --- Monthly badges ---

export type Badge = {
  key: string;
  emoji: string;
  label: string;
  description: string;
  /** Every player tied for the win; empty when nobody qualifies. */
  winners: { player: string; stat: string }[];
};

function monthRange(year: number, month: number): { start: string; end: string } {
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const end =
    month === 12
      ? `${year + 1}-01-01`
      : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return { start, end };
}

/** All aggregates tied for the best score, per `metric`; empty if none qualify. */
export function tiedWinners(
  aggs: RangeAggregate[],
  metric: (a: RangeAggregate) => number | null,
  higherIsBetter = true
): { agg: RangeAggregate; value: number }[] {
  let best: number | null = null;
  for (const a of aggs) {
    const v = metric(a);
    if (v === null) continue;
    if (best === null || (higherIsBetter ? v > best : v < best)) best = v;
  }
  if (best === null) return [];
  const bestVal = best;
  return aggs
    .filter((a) => metric(a) === bestVal)
    .map((a) => ({ agg: a, value: bestVal }));
}

export function monthlyBadges(entries: Entry[], year: number, month: number): Badge[] {
  const { start, end } = monthRange(year, month);
  const aggs = [...computeAwardsForRange(entries, start, end).values()];

  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevRange = monthRange(prevYear, prevMonth);
  const prev = computeAwardsForRange(entries, prevRange.start, prevRange.end);

  const pct = (num: number, den: number) => `${Math.round((100 * num) / den)}%`;

  const badges: Badge[] = [
    {
      key: "top_scorer",
      emoji: "👑",
      label: "Top Scorer",
      description: "Highest total winnings for the month.",
      winners: tiedWinners(aggs, (a) => a.total).map(({ agg }) => ({
        player: agg.player,
        stat: fmtMoney(agg.total),
      })),
    },
    {
      key: "most_accurate",
      emoji: "🎯",
      label: "Most Accurate",
      description: "Best correct rate (min. 5 answered).",
      winners: tiedWinners(
        aggs.filter((a) => a.answered >= 5),
        (a) => a.correct / a.answered
      ).map(({ agg }) => ({
        player: agg.player,
        stat: `${agg.correct}/${agg.answered} correct — ${pct(agg.correct, agg.answered)}`,
      })),
    },
    {
      key: "most_active",
      emoji: "📅",
      label: "Most Active",
      description: "Most entries logged, any result.",
      winners: tiedWinners(aggs, (a) => a.entryCount).map(({ agg }) => ({
        player: agg.player,
        stat: `${agg.entryCount} entr${agg.entryCount === 1 ? "y" : "ies"}`,
      })),
    },
    {
      key: "on_fire",
      emoji: "🔥",
      label: "On Fire",
      description: "Longest correct streak within the month (min. 2).",
      winners: tiedWinners(
        aggs.filter((a) => a.longestStreak >= 2),
        (a) => a.longestStreak
      ).map(({ agg }) => ({
        player: agg.player,
        stat: `${agg.longestStreak} in a row`,
      })),
    },
    {
      key: "wager_wizard",
      emoji: "🎲",
      label: "Wager Wizard",
      description: "Best Sunday wager win rate (min. 2 wagers).",
      winners: tiedWinners(
        aggs.filter((a) => a.wagerCount >= 2),
        (a) => a.wagerWins / a.wagerCount
      ).map(({ agg }) => ({
        player: agg.player,
        stat: `${agg.wagerWins}/${agg.wagerCount} wagers won — ${pct(agg.wagerWins, agg.wagerCount)}`,
      })),
    },
    {
      key: "most_improved",
      emoji: "📈",
      label: "Most Improved",
      description: "Biggest gain over their own previous month.",
      winners: tiedWinners(
        aggs.filter((a) => prev.has(a.player)),
        (a) => {
          const delta = a.total - prev.get(a.player)!.total;
          return delta > 0 ? delta : null;
        }
      ).map(({ agg, value }) => ({
        player: agg.player,
        stat: `+${fmtMoney(value)} vs last month`,
      })),
    },
    {
      key: "strategic_retreat",
      emoji: "🏳️",
      label: "Strategic Retreat",
      description: "Most passes taken.",
      winners: tiedWinners(
        aggs.filter((a) => a.passes >= 1),
        (a) => a.passes
      ).map(({ agg }) => ({
        player: agg.player,
        stat: `${agg.passes} pass${agg.passes === 1 ? "" : "es"}`,
      })),
    },
    {
      key: "rough_month",
      emoji: "🪦",
      label: "Rough Month",
      description: "Deepest in the red — condolences.",
      winners: tiedWinners(
        aggs.filter((a) => a.total < 0),
        (a) => a.total,
        false
      ).map(({ agg }) => ({
        player: agg.player,
        stat: fmtMoney(agg.total),
      })),
    },
  ];

  return badges;
}
