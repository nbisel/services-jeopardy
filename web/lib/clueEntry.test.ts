import { describe, expect, it } from "vitest";
import type { ClueScore, Entry, Player } from "./types";
import { monthlyTotals, streaks, weeklyRows } from "./stats";
import { SOLO_CLUE_VALUE } from "./soloRules";
import { computeAmount } from "./rules";

/**
 * Proves the Section 1 reuse strategy: a clue_scores row mapped into the shared
 * Entry shape flows through the existing stats functions unmodified.
 */
function mapToEntry(cs: ClueScore, players: Player[]): Entry {
  const name = players.find((p) => p.id === cs.player_id)?.name ?? "?";
  return {
    id: cs.id,
    player_id: cs.player_id,
    date: cs.date,
    result: cs.result,
    amount: cs.amount,
    wager: null,
    edit_count: cs.edit_count,
    player: name,
  };
}

let seq = 0;
function cs(
  playerId: string,
  date: string,
  result: "correct" | "incorrect" | "pass"
): ClueScore {
  return {
    id: String(++seq),
    player_id: playerId,
    clue_day_id: `day-${date}`,
    date,
    result,
    amount: computeAmount(result, SOLO_CLUE_VALUE),
    submitted_answer: result === "pass" ? null : "answer",
    edit_count: 0,
  };
}

const players: Player[] = [
  { id: "p1", name: "Ada", active: true },
  { id: "p2", name: "Grace", active: true },
];

describe("clue_scores mapped to Entry", () => {
  it("computes the flat solo value correctly per result", () => {
    const e = mapToEntry(cs("p1", "2026-07-13", "correct"), players);
    expect(e.amount).toBe(SOLO_CLUE_VALUE);
    expect(mapToEntry(cs("p1", "2026-07-14", "incorrect"), players).amount).toBe(-SOLO_CLUE_VALUE);
    expect(mapToEntry(cs("p1", "2026-07-15", "pass"), players).amount).toBe(0);
  });

  it("feeds weeklyRows (Mon–Sun placement + totals)", () => {
    const rows = [
      cs("p1", "2026-07-13", "correct"), // Mon
      cs("p1", "2026-07-14", "incorrect"), // Tue
      cs("p2", "2026-07-13", "correct"),
    ].map((r) => mapToEntry(r, players));

    const week = weeklyRows(rows, "2026-07-13");
    const ada = week.find((r) => r.player === "Ada")!;
    expect(ada.total).toBe(SOLO_CLUE_VALUE - SOLO_CLUE_VALUE); // +500 - 500 = 0
    expect(ada.cells[0]).toBe("correct"); // Monday
    expect(ada.cells[1]).toBe("incorrect"); // Tuesday
    const grace = week.find((r) => r.player === "Grace")!;
    expect(grace.total).toBe(SOLO_CLUE_VALUE);
  });

  it("feeds monthlyTotals", () => {
    const rows = [
      cs("p1", "2026-07-01", "correct"),
      cs("p1", "2026-07-02", "correct"),
      cs("p2", "2026-07-01", "incorrect"),
    ].map((r) => mapToEntry(r, players));

    expect(monthlyTotals(rows, 2026, 7)).toEqual([
      { player: "Ada", total: 2 * SOLO_CLUE_VALUE },
      { player: "Grace", total: -SOLO_CLUE_VALUE },
    ]);
  });

  it("feeds streaks (a pass or wrong answer resets current)", () => {
    const rows = [
      cs("p1", "2026-07-13", "correct"),
      cs("p1", "2026-07-14", "correct"),
      cs("p1", "2026-07-15", "pass"),
      cs("p1", "2026-07-16", "correct"),
    ].map((r) => mapToEntry(r, players));

    const [s] = streaks(rows);
    expect(s.player).toBe("Ada");
    expect(s.current).toBe(1);
    expect(s.longest).toBe(2);
  });
});
