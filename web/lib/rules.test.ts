import { describe, expect, it } from "vitest";
import type { Entry, ResultCode } from "./types";
import {
  addDaysStr,
  computeAmount,
  fmtMoney,
  isCorrect,
  isIncorrect,
  maxEntryDateStr,
  maxWager,
  todayStr,
  weekdayMon0,
  weekdaysLoggedCount,
  weekStartStr,
} from "./rules";

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

describe("computeAmount", () => {
  it("pays the day value for correct", () => {
    expect(computeAmount("correct", 1200)).toBe(1200);
  });
  it("charges the day value for incorrect", () => {
    expect(computeAmount("incorrect", 1200)).toBe(-1200);
  });
  it("is zero for a pass", () => {
    expect(computeAmount("pass", 2000)).toBe(0);
  });
});

describe("isCorrect / isIncorrect", () => {
  it("treats wager results like their plain counterparts", () => {
    expect(isCorrect("correct")).toBe(true);
    expect(isCorrect("correct_wager")).toBe(true);
    expect(isCorrect("incorrect")).toBe(false);
    expect(isCorrect("pass")).toBe(false);
    expect(isIncorrect("incorrect")).toBe(true);
    expect(isIncorrect("incorrect_wager")).toBe(true);
    expect(isIncorrect("correct")).toBe(false);
    expect(isIncorrect("pass")).toBe(false);
  });
});

describe("date helpers", () => {
  it("weekdayMon0 puts Monday at 0 and Sunday at 6", () => {
    expect(weekdayMon0("2026-07-13")).toBe(0);
    expect(weekdayMon0("2026-07-18")).toBe(5);
    expect(weekdayMon0("2026-07-19")).toBe(6);
  });

  it("weekStartStr returns the Monday of the containing week", () => {
    expect(weekStartStr("2026-07-13")).toBe("2026-07-13");
    expect(weekStartStr("2026-07-19")).toBe("2026-07-13");
    expect(weekStartStr("2026-07-01")).toBe("2026-06-29");
  });

  it("addDaysStr crosses month and year boundaries", () => {
    expect(addDaysStr("2026-07-31", 1)).toBe("2026-08-01");
    expect(addDaysStr("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDaysStr("2026-01-01", -1)).toBe("2025-12-31");
  });

  it("maxEntryDateStr is two days ahead of today", () => {
    expect(maxEntryDateStr()).toBe(addDaysStr(todayStr(), 2));
  });
});

describe("maxWager", () => {
  const sunday = "2026-07-19";

  it("caps at the absolute Mon–Sat total for the week", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "correct", 600),
    ];
    expect(maxWager(entries, "A", sunday)).toBe(800);
  });

  it("takes the absolute value of a negative week", () => {
    const entries = [
      e("A", "2026-07-13", "incorrect", -200),
      e("A", "2026-07-15", "incorrect", -1000),
    ];
    expect(maxWager(entries, "A", sunday)).toBe(1200);
  });

  it("ignores other weeks and other players", () => {
    const entries = [
      e("A", "2026-07-06", "correct", 200), // previous week
      e("B", "2026-07-14", "correct", 600), // other player
      e("A", "2026-07-17", "correct", 1200),
    ];
    expect(maxWager(entries, "A", sunday)).toBe(1200);
  });

  it("is zero with no Mon–Sat entries", () => {
    expect(maxWager([], "A", sunday)).toBe(0);
  });
});

describe("weekdaysLoggedCount", () => {
  const sunday = "2026-07-19";

  it("counts distinct Mon–Sat dates logged before the Sunday", () => {
    const entries = [
      e("A", "2026-07-13", "correct", 200),
      e("A", "2026-07-14", "incorrect", -600),
      e("A", "2026-07-16", "pass", 0),
    ];
    expect(weekdaysLoggedCount(entries, "A", sunday)).toBe(3);
  });

  it("reaches 6 with a full week", () => {
    const dates = ["2026-07-13", "2026-07-14", "2026-07-15", "2026-07-16", "2026-07-17", "2026-07-18"];
    const entries = dates.map((d) => e("A", d, "correct", 100));
    expect(weekdaysLoggedCount(entries, "A", sunday)).toBe(6);
  });

  it("ignores other players and other weeks", () => {
    const entries = [
      e("B", "2026-07-13", "correct", 200),
      e("A", "2026-07-06", "correct", 200),
    ];
    expect(weekdaysLoggedCount(entries, "A", sunday)).toBe(0);
  });
});

describe("fmtMoney", () => {
  it("formats positives with a dollar sign", () => {
    expect(fmtMoney(200)).toBe("$200");
  });
  it("puts the minus sign before the dollar sign", () => {
    expect(fmtMoney(-500)).toBe("-$500");
  });
  it("keeps thousands separators on negatives", () => {
    expect(fmtMoney(-1200)).toBe("-$1,200");
  });
  it("formats zero without a sign", () => {
    expect(fmtMoney(0)).toBe("$0");
  });
});
