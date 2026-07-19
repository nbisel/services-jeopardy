import { supabase } from "./supabase";
import { computeAmount } from "./rules";
import { isAnswerCorrect } from "./grading";
import type { WriteResult } from "./api";

export type ClueSubmitResult =
  | { ok: true; result: "correct" | "incorrect" | "pass"; amount: number; accepted: string }
  | { ok: false; error: string };

function mapWriteError(message: string): string {
  if (message.includes("EDIT_LIMIT_REACHED")) {
    return "Edit limit reached — you've already changed this answer once.";
  }
  return `Could not save: ${message}`;
}

async function loadClue(
  clueDayId: string
): Promise<{ value: number; accepted: string } | null> {
  const { data: day, error } = await supabase
    .from("clue_days")
    .select("value, clue_pool_id")
    .eq("id", clueDayId)
    .single();
  if (error || !day) return null;

  const { data: pool, error: poolErr } = await supabase
    .from("clue_pool")
    .select("correct_answer")
    .eq("id", day.clue_pool_id)
    .single();
  if (poolErr || !pool) return null;

  return { value: day.value, accepted: pool.correct_answer };
}

/**
 * Grade a free-text answer against the day's stored accepted answer and record
 * it. Grading is authoritative to the DB value, not to anything the client
 * passes. Follows upsertScore's error-mapping (shared EDIT_LIMIT_REACHED case).
 */
export async function submitClueAnswer(input: {
  playerId: string;
  clueDayId: string;
  date: string;
  submittedAnswer: string;
}): Promise<ClueSubmitResult> {
  const clue = await loadClue(input.clueDayId);
  if (!clue) return { ok: false, error: "Couldn't load this clue — try again." };

  const correct = isAnswerCorrect(input.submittedAnswer, clue.accepted);
  const result = correct ? "correct" : "incorrect";
  const amount = computeAmount(result, clue.value);

  const { error } = await supabase.from("clue_scores").upsert(
    {
      player_id: input.playerId,
      clue_day_id: input.clueDayId,
      date: input.date,
      result,
      amount,
      submitted_answer: input.submittedAnswer,
    },
    { onConflict: "player_id,clue_day_id" }
  );

  if (error) return { ok: false, error: mapWriteError(error.message) };
  return { ok: true, result, amount, accepted: clue.accepted };
}

/** Record a deliberate pass (0 points), revealing the accepted answer. */
export async function passClue(input: {
  playerId: string;
  clueDayId: string;
  date: string;
}): Promise<ClueSubmitResult> {
  const clue = await loadClue(input.clueDayId);
  if (!clue) return { ok: false, error: "Couldn't load this clue — try again." };

  const { error } = await supabase.from("clue_scores").upsert(
    {
      player_id: input.playerId,
      clue_day_id: input.clueDayId,
      date: input.date,
      result: "pass",
      amount: 0,
      submitted_answer: null,
    },
    { onConflict: "player_id,clue_day_id" }
  );

  if (error) return { ok: false, error: mapWriteError(error.message) };
  return { ok: true, result: "pass", amount: 0, accepted: clue.accepted };
}

/** Manage Clues: approve a pending pool row so it's eligible for assignment. */
export async function approveClue(id: string): Promise<WriteResult> {
  const { error } = await supabase
    .from("clue_pool")
    .update({ status: "approved" })
    .eq("id", id);
  if (error) return { ok: false, error: `Could not approve: ${error.message}` };
  return { ok: true };
}

/** Manage Clues: skip a pending pool row so it's never assigned. */
export async function skipClue(id: string): Promise<WriteResult> {
  const { error } = await supabase
    .from("clue_pool")
    .update({ status: "skipped" })
    .eq("id", id);
  if (error) return { ok: false, error: `Could not skip: ${error.message}` };
  return { ok: true };
}
