import { describe, expect, it, vi } from "vitest";
import { assignDailyClue, type AssignDeps } from "./assignClue";

function makeDeps(over: Partial<AssignDeps> = {}): AssignDeps {
  return {
    today: "2026-07-18",
    value: 500,
    clueDayExists: async () => false,
    listApprovedClueIds: async () => ["clue-a", "clue-b", "clue-c"],
    insertClueDay: async () => "inserted",
    markClueAssigned: async () => {},
    random: () => 0, // deterministic: always picks index 0
    ...over,
  };
}

describe("assignDailyClue", () => {
  it("assigns an approved clue when none exists for today", async () => {
    const markClueAssigned = vi.fn(async () => {});
    const insertClueDay = vi.fn(async () => "inserted" as const);
    const res = await assignDailyClue(makeDeps({ markClueAssigned, insertClueDay }));

    expect(res).toEqual({ status: "assigned", date: "2026-07-18", cluePoolId: "clue-a" });
    expect(insertClueDay).toHaveBeenCalledWith("2026-07-18", "clue-a", 500);
    expect(markClueAssigned).toHaveBeenCalledWith("clue-a");
  });

  it("is idempotent: no-op when today already has a clue", async () => {
    const insertClueDay = vi.fn(async () => "inserted" as const);
    const listApprovedClueIds = vi.fn(async () => ["clue-a"]);
    const res = await assignDailyClue(
      makeDeps({ clueDayExists: async () => true, insertClueDay, listApprovedClueIds })
    );

    expect(res).toEqual({ status: "exists", date: "2026-07-18" });
    // Never touched the pool or inserted a second row.
    expect(listApprovedClueIds).not.toHaveBeenCalled();
    expect(insertClueDay).not.toHaveBeenCalled();
  });

  it("no-ops safely when the approved pool is empty", async () => {
    const insertClueDay = vi.fn(async () => "inserted" as const);
    const res = await assignDailyClue(
      makeDeps({ listApprovedClueIds: async () => [], insertClueDay })
    );

    expect(res).toEqual({ status: "empty", date: "2026-07-18" });
    expect(insertClueDay).not.toHaveBeenCalled();
  });

  it("treats a concurrent insert (unique-date violation) as already-assigned", async () => {
    const markClueAssigned = vi.fn(async () => {});
    const res = await assignDailyClue(
      makeDeps({ insertClueDay: async () => "duplicate", markClueAssigned })
    );

    expect(res).toEqual({ status: "exists", date: "2026-07-18" });
    // The losing run must not mark any pool row assigned.
    expect(markClueAssigned).not.toHaveBeenCalled();
  });
});
