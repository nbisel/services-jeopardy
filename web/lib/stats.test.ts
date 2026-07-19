import { describe, expect, it } from "vitest";
import type { Entry, ResultCode } from "./types";
import {
  annualPivot,
  headToHead,
  monthlyTotals,
  raceData,
  records,
  streaks,
  wagerProfiles,
  weekdayWinRates,
  weeklyRows,
} from "./stats";

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

// Week under test: Mon 2026-07-13 … Sun 2026-07-19.
const WEEK = "2026-07-13";

describe("weeklyRows", () => {
  it("places results in Mon..Sun cells and sums totals", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-19", "correct_wager", 500, 500),
      e("B", "2026-07-14", "incorrect", -600),
      e("A", "2026-07-20", "correct", 200), // next week — excluded
    ];
    const rows = weeklyRows(entries, WEEK);
    expect(rows).toHaveLength(2);
    expect(rows[0].player).toBe("A");
    expect(rows[0].total).toBe(700);
    expect(rows[0].cells[0]).toBe("correct");
    expect(rows[0].cells[6]).toBe("correct_wager");
    expect(rows[1].player).toBe("B");
    expect(rows[1].total).toBe(-600);
  });
});

describe("monthlyTotals", () => {
  it("sums by month and sorts descending", () => {
    const entries = [
      e("A", "2026-07-01", "correct", 1000),
      e("A", "2026-07-02", "incorrect", -400),
      e("B", "2026-07-03", "correct", 1200),
      e("A", "2026-06-30", "correct", 600), // June — excluded
    ];
    const totals = monthlyTotals(entries, 2026, 7);
    expect(totals).toEqual([
      { player: "B", total: 1200 },
      { player: "A", total: 600 },
    ]);
  });
});

describe("annualPivot", () => {
  it("pivots months, nulls future months, and totals YTD", () => {
    const entries = [
      e("A", "2026-01-05", "correct", 200),
      e("A", "2026-03-04", "correct", 1000),
      e("A", "2025-12-31", "correct", 2000), // other year — excluded
    ];
    const rows = annualPivot(entries, 2026, 3);
    expect(rows).toHaveLength(1);
    expect(rows[0].months[0]).toBe(200);
    expect(rows[0].months[1]).toBe(0); // February: past month, played nothing
    expect(rows[0].months[2]).toBe(1000);
    expect(rows[0].months[3]).toBeNull(); // April: not reached yet
    expect(rows[0].ytd).toBe(1200);
  });
});

describe("streaks", () => {
  it("a pass resets the current streak but keeps the longest", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "correct", 600),
      e("A", "2026-07-15", "correct", 1000),
      e("A", "2026-07-16", "pass", 0),
    ];
    const [s] = streaks(entries);
    expect(s.current).toBe(0);
    expect(s.longest).toBe(3);
  });

  it("an incorrect resets the current streak but keeps the longest", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "correct", 600),
      e("A", "2026-07-15", "incorrect", -1000),
      e("A", "2026-07-16", "correct", 400),
    ];
    const [s] = streaks(entries);
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });

  it("won wagers extend a streak", () => {
    const entries = [
      e("A", "2026-07-18", "correct", 2000),
      e("A", "2026-07-19", "correct_wager", 800, 800),
    ];
    const [s] = streaks(entries);
    expect(s.current).toBe(2);
  });
});

describe("records", () => {
  it("counts perfect weeks only when all six Mon–Sat entries are correct", () => {
    const perfectDates = ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18"];
    const entries = [
      ...perfectDates.map((d) => e("A", d, "correct", 100)),
      // B has 5 correct + 1 incorrect — not perfect
      ...perfectDates.slice(0, 5).map((d) => e("B", d, "correct", 100)),
      e("B", "2026-07-18", "incorrect", -2000),
    ];
    const rec = records(entries).find((r) => r.label.startsWith("Perfect weeks"));
    expect(rec).toBeDefined();
    expect(rec!.player).toBe("A");
    expect(rec!.detail).toBe("1 perfect week");
  });

  it("requires all six days for a perfect week", () => {
    // Only 5 correct Mon–Fri entries: no perfect week for anyone.
    const entries = ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17"].map(
      (d) => e("A", d, "correct", 100)
    );
    const rec = records(entries).find((r) => r.label.startsWith("Perfect weeks"));
    expect(rec).toBeUndefined();
  });

  it("biggest comeback requires dipping negative before climbing", () => {
    const entries = [
      e("A", "2026-07-13", "incorrect", -200), // cum -200
      e("A", "2026-07-14", "correct", 600), // cum 400 — climb of 600
      // B climbs more but never goes negative
      e("B", "2026-07-13", "correct", 200),
      e("B", "2026-07-15", "correct", 1000),
    ];
    const rec = records(entries).find((r) => r.label === "Biggest comeback");
    expect(rec).toBeDefined();
    expect(rec!.player).toBe("A");
  });

  it("no comeback record when nobody went negative", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "correct", 600),
    ];
    const rec = records(entries).find((r) => r.label === "Biggest comeback");
    expect(rec).toBeUndefined();
  });
});

describe("headToHead", () => {
  it("scores shared days and overall totals", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("B", "2026-07-13", "incorrect", -200),
      e("A", "2026-07-14", "correct", 600),
      e("B", "2026-07-14", "correct", 600),
      e("B", "2026-07-15", "correct", 1000), // A didn't play
    ];
    const h = headToHead(entries, "A", "B");
    expect(h.daysBothPlayed).toBe(2);
    expect(h.aWins).toBe(1);
    expect(h.bWins).toBe(0);
    expect(h.ties).toBe(1);
    expect(h.aTotal).toBe(800);
    expect(h.bTotal).toBe(1400);
    expect(h.aWinRate).toBe(1);
    expect(h.bWinRate).toBeCloseTo(2 / 3);
  });
});

describe("raceData", () => {
  it("builds cumulative series through the month", () => {
    const entries = [
      e("A", "2026-07-01", "correct", 1000),
      e("A", "2026-07-02", "incorrect", -400),
      e("B", "2026-07-02", "correct", 600),
    ];
    const { data, series } = raceData(entries, 2026, 7);
    expect(series).toEqual(["A", "B"]);
    expect(data).toHaveLength(2);
    expect(data[0]).toMatchObject({ day: 1, A: 1000, B: 0 });
    expect(data[1]).toMatchObject({ day: 2, A: 600, B: 600 });
  });

  it("returns empty for a month with no entries", () => {
    expect(raceData([], 2026, 7)).toEqual({ data: [], series: [] });
  });
});

describe("weekdayWinRates", () => {
  it("excludes passes from the denominator", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200), // Monday
      e("B", "2026-07-13", "incorrect", -200),
      e("C", "2026-07-13", "pass", 0),
    ];
    const rates = weekdayWinRates(entries);
    const mon = rates.find((r) => r.day === "Mon")!;
    expect(mon.answered).toBe(2);
    expect(mon.correct).toBe(1);
    expect(mon.rate).toBe(50);
  });
});

describe("wagerProfiles", () => {
  it("computes average risk and win rate", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "correct", 600), // bankroll 800
      e("A", "2026-07-19", "correct_wager", 400, 400), // 50% risk, won
    ];
    const [p] = wagerProfiles(entries);
    expect(p.player).toBe("A");
    expect(p.avgRiskPct).toBe(50);
    expect(p.winRate).toBe(100);
    expect(p.count).toBe(1);
  });

  it("skips players with no wagers", () => {
    const entries = [e("A", "2026-07-13", "correct", 200)];
    expect(wagerProfiles(entries)).toHaveLength(0);
  });
});
