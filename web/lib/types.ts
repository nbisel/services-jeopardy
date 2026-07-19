export type ResultCode =
  | "correct"
  | "incorrect"
  | "pass"
  | "correct_wager"
  | "incorrect_wager";

export type Player = {
  id: string;
  name: string;
  active: boolean;
};

export type Score = {
  id: string;
  player_id: string;
  date: string; // YYYY-MM-DD
  result: ResultCode;
  amount: number;
  wager: number | null;
  edit_count: number;
};

/** A score joined with its player's name. */
export type Entry = Score & { player: string };
