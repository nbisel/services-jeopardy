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

// --- Solo Trivia ---

export type ClueStatus = "pending" | "approved" | "skipped" | "assigned";

export type CluePoolRow = {
  id: string;
  category: string | null;
  clue_text: string;
  correct_answer: string;
  difficulty: string;
  source: string;
  status: ClueStatus;
  text_hash: string;
  created_at: string;
};

/** A date's assigned clue, joined with its pool row for display. */
export type ClueDay = {
  id: string;
  date: string; // YYYY-MM-DD
  value: number;
  category: string | null;
  clue_text: string;
  correct_answer: string;
};

export type ClueScore = {
  id: string;
  player_id: string;
  clue_day_id: string;
  date: string; // YYYY-MM-DD
  result: "correct" | "incorrect" | "pass";
  amount: number;
  submitted_answer: string | null;
  edit_count: number;
};
