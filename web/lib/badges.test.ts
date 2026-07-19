import { describe, expect, it } from "vitest";
import type { Entry, ResultCode } from "./types";
import { computeAwardsForRange, monthlyBadges } from "./badges";

let id = 0;
function e(
  player: string,
  date: string,
  result: ResultCode,
  amount: number,
  wager: number | null = null
): Entry {
  return {
    id: String(++id),
    player_id: player,
    player,
    date,
    result,
    amount,
    wager,
    edit_count: 0,
  };
}

function badge(entries: Entry[], key: string, year = 2026, month = 7) {
  const b = monthlyBadges(entries, year, month).find((x) => x.key === key);
  expect(b).toBeDefined();
  return b!;
}

// July 2026: Mon 7/6, Sun 7/12, Mon 7/13, Sun 7/19.

describe("computeAwardsForRange", () => {
  it("aggregates counts, totals, and streaks within the range only", () => {
    const entries = [
      e("A", "2026-06-30", "correct", 600), // outside range
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "correct", 600),
      e("A", "2026-07-15", "incorrect", -1000),
      e("A", "2026-07-16", "pass", 0),
    ];
    const agg = computeAwardsForRange(entries, "2026-07-01", "2026-08-01").get("A")!;
    expect(agg.total).toBe(-200);
    expect(agg.correct).toBe(2);
    expect(agg.incorrect).toBe(1);
    expect(agg.passes).toBe(1);
    expect(agg.answered).toBe(3);
    expect(agg.entryCount).toBe(4);
    expect(agg.longestStreak).toBe(2);
    expect(agg.daysPlayed).toBe(4);
    expect(agg.consecutiveDaysPlayed).toBe(4);
  });
});

describe("Top Scorer", () => {
  it("goes to the highest monthly total, with ties shared", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "correct", 600),
      e("B", "2026-07-15", "correct", 800),
      e("C", "2026-07-16", "correct", 400),
    ];
    const b = badge(entries, "top_scorer");
    expect(b.winners.map((w) => w.player).sort()).toEqual(["A", "B"]);
    expect(b.winners[0].stat).toBe("$800");
  });

  it("awards nobody in an empty month", () => {
    const entries = [e("A", "2026-06-01", "correct", 200)];
    expect(badge(entries, "top_scorer").winners).toHaveLength(0);
  });
});

describe("Most Accurate", () => {
  it("requires at least 5 answered entries", () => {
    const entries = [
      // A: 4/5 = 80% on 5 answered — qualifies
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "correct", 600),
      e("A", "2026-07-15", "correct", 1000),
      e("A", "2026-07-16", "correct", 400),
      e("A", "2026-07-17", "incorrect", -1200),
      // B: 3/3 = 100% but only 3 answered — doesn't qualify
      e("B", "2026-07-13", "correct", 200),
      e("B", "2026-07-14", "correct", 600),
      e("B", "2026-07-15", "correct", 1000),
    ];
    const b = badge(entries, "most_accurate");
    expect(b.winners.map((w) => w.player)).toEqual(["A"]);
    expect(b.winners[0].stat).toBe("4/5 correct — 80%");
  });

  it("excludes passes from both sides of the rate", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "correct", 600),
      e("A", "2026-07-15", "correct", 1000),
      e("A", "2026-07-16", "correct", 400),
      e("A", "2026-07-17", "correct", 1200),
      e("A", "2026-07-18", "pass", 0), // pass doesn't dilute the 100%
    ];
    const b = badge(entries, "most_accurate");
    expect(b.winners[0].stat).toBe("5/5 correct — 100%");
  });

  it("awards nobody when everyone is under the threshold", () => {
    const entries = [e("A", "2026-07-13", "correct", 200)];
    expect(badge(entries, "most_accurate").winners).toHaveLength(0);
  });
});

describe("Most Active", () => {
  it("counts entries regardless of result", () => {
    const entries = [
      e("A", "2026-07-13", "pass", 0),
      e("A", "2026-07-14", "incorrect", -600),
      e("B", "2026-07-13", "correct", 200),
    ];
    const b = badge(entries, "most_active");
    expect(b.winners.map((w) => w.player)).toEqual(["A"]);
    expect(b.winners[0].stat).toBe("2 entries");
  });

  it("awards nobody in an empty month", () => {
    expect(badge([], "most_active").winners).toHaveLength(0);
  });
});

describe("On Fire", () => {
  it("resets the streak at the month boundary", () => {
    const entries = [
      e("A", "2026-06-29", "correct", 200),
      e("A", "2026-06-30", "correct", 600),
      e("A", "2026-07-01", "correct", 1000),
      e("A", "2026-07-02", "correct", 400),
    ];
    const b = badge(entries, "on_fire");
    // Only the two July entries count — the June run doesn't carry in.
    expect(b.winners[0].stat).toBe("2 in a row");
  });

  it("a single correct answer is not a streak", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "incorrect", -600),
    ];
    expect(badge(entries, "on_fire").winners).toHaveLength(0);
  });
});

describe("Wager Wizard", () => {
  it("requires at least 2 wagers", () => {
    const entries = [
      // A: 2 wagers, 1 won
      e("A", "2026-07-06", "correct", 200),
      e("A", "2026-07-12", "correct_wager", 200, 200),
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-19", "incorrect_wager", -200, 200),
      // B: 1 wager, won — doesn't qualify
      e("B", "2026-07-13", "correct", 200),
      e("B", "2026-07-19", "correct_wager", 200, 200),
    ];
    const b = badge(entries, "wager_wizard");
    expect(b.winners.map((w) => w.player)).toEqual(["A"]);
    expect(b.winners[0].stat).toBe("1/2 wagers won — 50%");
  });

  it("awards nobody without enough wagers", () => {
    const entries = [e("A", "2026-07-19", "correct_wager", 200, 200)];
    expect(badge(entries, "wager_wizard").winners).toHaveLength(0);
  });
});

describe("Most Improved", () => {
  it("rewards the biggest gain over the previous month", () => {
    const entries = [
      e("A", "2026-06-01", "correct", 200), // June: +200
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "correct", 600), // July: +800 → +600 delta
      e("B", "2026-06-02", "correct", 600), // June: +600
      e("B", "2026-07-13", "correct", 200), // July: +200 → declined
    ];
    const b = badge(entries, "most_improved");
    expect(b.winners.map((w) => w.player)).toEqual(["A"]);
    expect(b.winners[0].stat).toBe("+$600 vs last month");
  });

  it("requires entries in both months — no baseline, no badge", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200), // July only
    ];
    expect(badge(entries, "most_improved").winners).toHaveLength(0);
  });

  it("awards nobody when nobody improved", () => {
    const entries = [
      e("A", "2026-06-01", "correct", 600),
      e("A", "2026-07-13", "correct", 200), // worse than June
    ];
    expect(badge(entries, "most_improved").winners).toHaveLength(0);
  });
});

describe("Strategic Retreat", () => {
  it("goes to the most passes", () => {
    const entries = [
      e("A", "2026-07-13", "pass", 0),
      e("A", "2026-07-14", "pass", 0),
      e("B", "2026-07-13", "pass", 0),
    ];
    const b = badge(entries, "strategic_retreat");
    expect(b.winners.map((w) => w.player)).toEqual(["A"]);
    expect(b.winners[0].stat).toBe("2 passes");
  });

  it("awards nobody when no passes were taken", () => {
    const entries = [e("A", "2026-07-13", "correct", 200)];
    expect(badge(entries, "strategic_retreat").winners).toHaveLength(0);
  });
});

describe("Rough Month", () => {
  it("goes to the most negative total", () => {
    const entries = [
      e("A", "2026-07-13", "incorrect", -200),
      e("A", "2026-07-14", "incorrect", -600),
      e("B", "2026-07-13", "incorrect", -200),
      e("B", "2026-07-14", "correct", 600),
    ];
    const b = badge(entries, "rough_month");
    expect(b.winners.map((w) => w.player)).toEqual(["A"]);
    expect(b.winners[0].stat).toBe("-$800");
  });

  it("is skipped entirely when everyone is net-positive", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("B", "2026-07-13", "correct", 200),
    ];
    expect(badge(entries, "rough_month").winners).toHaveLength(0);
  });
});
