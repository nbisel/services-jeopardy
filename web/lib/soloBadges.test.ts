import { describe, expect, it } from "vitest";
import type { Entry } from "./types";
import { monthlyBadges, soloMonthlyBadges } from "./badges";
import { SOLO_CLUE_VALUE } from "./soloRules";
import { computeAmount } from "./rules";

let seq = 0;
function e(player: string, date: string, result: "correct" | "incorrect" | "pass"): Entry {
  return {
    id: String(++seq),
    player_id: player,
    player,
    date,
    result,
    amount: computeAmount(result, SOLO_CLUE_VALUE),
    wager: null,
    edit_count: 0,
  };
}

describe("soloMonthlyBadges", () => {
  it("returns the same badge set as the main game minus Wager Wizard", () => {
    const solo = soloMonthlyBadges([], 2026, 7).map((b) => b.key);
    const main = monthlyBadges([], 2026, 7).map((b) => b.key);
    expect(main).toContain("wager_wizard");
    expect(solo).not.toContain("wager_wizard");
    expect(solo).toEqual(main.filter((k) => k !== "wager_wizard"));
    expect(solo).toHaveLength(7);
  });

  it("awards Top Scorer / Most Active from Solo Trivia scores", () => {
    const entries = [
      e("Ada", "2026-07-06", "correct"),
      e("Ada", "2026-07-07", "correct"),
      e("Grace", "2026-07-06", "incorrect"),
    ];
    const badges = soloMonthlyBadges(entries, 2026, 7);
    const top = badges.find((b) => b.key === "top_scorer")!;
    expect(top.winners.map((w) => w.player)).toEqual(["Ada"]);
    expect(top.winners[0].stat).toBe("$1,000");

    const active = badges.find((b) => b.key === "most_active")!;
    expect(active.winners.map((w) => w.player)).toEqual(["Ada"]);
  });

  it("awards Strategic Retreat for passes (Solo has pass results)", () => {
    const entries = [
      e("Ada", "2026-07-06", "pass"),
      e("Ada", "2026-07-07", "pass"),
      e("Grace", "2026-07-06", "correct"),
    ];
    const retreat = soloMonthlyBadges(entries, 2026, 7).find((b) => b.key === "strategic_retreat")!;
    expect(retreat.winners.map((w) => w.player)).toEqual(["Ada"]);
    expect(retreat.winners[0].stat).toBe("2 passes");
  });
});
