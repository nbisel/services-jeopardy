/**
 * Pure daily-assignment logic, decoupled from Supabase/HTTP so it can be
 * unit-tested. The API route (app/api/assign-daily-clue/route.ts) wires the
 * real data-access callbacks; tests wire fakes.
 *
 * Idempotency rests on the clue_days.date UNIQUE constraint: even if two runs
 * race past the existence check, only one INSERT wins and the other reports
 * "exists" via a duplicate result rather than creating a second row.
 */
export type AssignResult =
  | { status: "exists"; date: string }
  | { status: "empty"; date: string }
  | { status: "assigned"; date: string; cluePoolId: string };

export type AssignDeps = {
  /** Today's date (YYYY-MM-DD) in the team's timezone. */
  today: string;
  value: number;
  /** True if a clue_days row already exists for `date`. */
  clueDayExists: (date: string) => Promise<boolean>;
  /** IDs of clue_pool rows with status = 'approved'. */
  listApprovedClueIds: () => Promise<string[]>;
  /** Insert clue_days; resolves "duplicate" on a unique-date violation. */
  insertClueDay: (
    date: string,
    cluePoolId: string,
    value: number
  ) => Promise<"inserted" | "duplicate">;
  /** Mark the chosen clue_pool row as 'assigned'. */
  markClueAssigned: (cluePoolId: string) => Promise<void>;
  /** Injectable for deterministic tests; defaults to Math.random. */
  random?: () => number;
};

export async function assignDailyClue(deps: AssignDeps): Promise<AssignResult> {
  const { today, value } = deps;
  const rand = deps.random ?? Math.random;

  if (await deps.clueDayExists(today)) {
    return { status: "exists", date: today };
  }

  const approved = await deps.listApprovedClueIds();
  if (approved.length === 0) {
    return { status: "empty", date: today };
  }

  const cluePoolId = approved[Math.floor(rand() * approved.length)];
  const outcome = await deps.insertClueDay(today, cluePoolId, value);
  if (outcome === "duplicate") {
    // Lost a race with a concurrent run — that run assigned today's clue.
    return { status: "exists", date: today };
  }

  await deps.markClueAssigned(cluePoolId);
  return { status: "assigned", date: today, cluePoolId };
}
