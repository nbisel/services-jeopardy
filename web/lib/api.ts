import { supabase } from "./supabase";
import { MAX_NAME_LENGTH } from "./rules";
import type { Player, ResultCode } from "./types";

export type WriteResult = { ok: true } | { ok: false; error: string };

export async function upsertScore(input: {
  playerId: string;
  date: string;
  result: ResultCode;
  amount: number;
  wager?: number | null;
}): Promise<WriteResult> {
  const { error } = await supabase.from("scores").upsert(
    {
      player_id: input.playerId,
      date: input.date,
      result: input.result,
      amount: input.amount,
      wager: input.wager ?? null,
    },
    { onConflict: "player_id,date" }
  );

  if (!error) return { ok: true };
  if (error.message.includes("EDIT_LIMIT_REACHED")) {
    return {
      ok: false,
      error: "Edit limit reached — this date's score was already changed once.",
    };
  }
  return { ok: false, error: `Could not save: ${error.message}` };
}

export async function addPlayer(
  name: string
): Promise<{ ok: true; player: Player } | { ok: false; error: string }> {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: "Enter a name." };
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Names are capped at ${MAX_NAME_LENGTH} characters.` };
  }

  const { data, error } = await supabase
    .from("players")
    .insert({ name: trimmed })
    .select("id, name, active")
    .single();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "That player already exists — pick them from the list." };
    }
    return { ok: false, error: `Could not add player: ${error.message}` };
  }
  return { ok: true, player: data };
}

export async function renamePlayer(id: string, newName: string): Promise<WriteResult> {
  const trimmed = newName.trim();
  if (!trimmed) return { ok: false, error: "Enter a name." };
  if (trimmed.length > MAX_NAME_LENGTH) {
    return { ok: false, error: `Names are capped at ${MAX_NAME_LENGTH} characters.` };
  }

  const { error } = await supabase.from("players").update({ name: trimmed }).eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Another player already has that name." };
    }
    return { ok: false, error: `Could not rename player: ${error.message}` };
  }
  return { ok: true };
}

export async function setPlayerActive(id: string, active: boolean): Promise<WriteResult> {
  const { error } = await supabase.from("players").update({ active }).eq("id", id);
  if (error) {
    return {
      ok: false,
      error: `Could not ${active ? "restore" : "archive"} player: ${error.message}`,
    };
  }
  return { ok: true };
}
