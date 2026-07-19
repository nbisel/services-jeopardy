"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerPicker from "./PlayerPicker";
import { passClue, submitClueAnswer, type ClueSubmitResult } from "@/lib/clueApi";
import type { ClueDay, Entry, Player } from "@/lib/types";
import { fmtMoney, formatDateLong, weekStartStr } from "@/lib/rules";
import { soloDateStr } from "@/lib/soloRules";

const STORAGE_KEY = "sjt-player"; // shared with the main game's picker

export default function SoloPlay({
  players,
  entries,
  clueDays,
  onSaved,
}: {
  players: Player[];
  entries: Entry[];
  clueDays: ClueDay[];
  onSaved: () => void;
}) {
  const [playerId, setPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setPlayerId(saved);
  }, []);

  function choose(id: string) {
    setPlayerId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const today = soloDateStr();
  const weekStart = weekStartStr(today);

  // Entries for this player, keyed by date (date is 1:1 with a clue_day).
  const entryByDate = useMemo(() => {
    const m = new Map<string, Entry>();
    for (const e of entries) if (e.player_id === playerId) m.set(e.date, e);
    return m;
  }, [entries, playerId]);

  const todayClue = clueDays.find((d) => d.date === today) ?? null;

  // This week's earlier clues (before today) the player hasn't answered yet.
  const catchUp = useMemo(
    () =>
      clueDays
        .filter((d) => d.date >= weekStart && d.date < today && !entryByDate.has(d.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [clueDays, weekStart, today, entryByDate]
  );

  // Already-answered clues this week (history).
  const history = useMemo(
    () =>
      clueDays
        .filter((d) => d.date >= weekStart && d.date <= today && entryByDate.has(d.date))
        .sort((a, b) => b.date.localeCompare(a.date)),
    [clueDays, weekStart, today, entryByDate]
  );

  return (
    <div className="space-y-5">
      <PlayerPicker players={players} value={playerId} onChange={choose} onPlayerAdded={onSaved} />

      {!playerId ? (
        <p className="text-sm text-ink3">Pick who you are to start playing.</p>
      ) : (
        <>
          {/* Today's clue */}
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">
              Today’s clue
            </div>
            {todayClue ? (
              <ClueCard
                clue={todayClue}
                existing={entryByDate.get(todayClue.date)}
                playerId={playerId}
                onSaved={onSaved}
                highlight
              />
            ) : (
              <p className="rounded-xl border border-line bg-card p-5 text-sm text-ink3">
                No clue assigned yet today — check back once the morning draw runs, or the pool may
                need more approved clues.
              </p>
            )}
          </div>

          {/* Catch-up */}
          {catchUp.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">
                Catch up on this week ({catchUp.length})
              </div>
              <div className="space-y-3">
                {catchUp.map((c) => (
                  <ClueCard
                    key={c.id}
                    clue={c}
                    existing={undefined}
                    playerId={playerId}
                    onSaved={onSaved}
                  />
                ))}
              </div>
            </div>
          )}

          {/* History */}
          {history.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">
                Your week so far
              </div>
              <div className="space-y-3">
                {history
                  .filter((c) => c.date !== today) // today's clue already shown above
                  .map((c) => (
                    <ClueCard
                      key={c.id}
                      clue={c}
                      existing={entryByDate.get(c.date)}
                      playerId={playerId}
                      onSaved={onSaved}
                    />
                  ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function ClueCard({
  clue,
  existing,
  playerId,
  onSaved,
  highlight = false,
}: {
  clue: ClueDay;
  existing: Entry | undefined;
  playerId: string;
  onSaved: () => void;
  highlight?: boolean;
}) {
  const locked = !!existing && existing.edit_count >= 1;
  const [editing, setEditing] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<ClueSubmitResult | null>(null);

  const showInput = !locked && (!existing || editing);

  async function handle(action: "submit" | "pass") {
    if (action === "submit" && !answer.trim()) return;
    setBusy(true);
    setFeedback(null);
    const res =
      action === "submit"
        ? await submitClueAnswer({
            playerId,
            clueDayId: clue.id,
            date: clue.date,
            submittedAnswer: answer,
          })
        : await passClue({ playerId, clueDayId: clue.id, date: clue.date });
    setBusy(false);
    setFeedback(res);
    if (res.ok) {
      setEditing(false);
      onSaved();
    }
  }

  const resultTone =
    existing?.result === "correct"
      ? "text-up"
      : existing?.result === "incorrect"
        ? "text-down"
        : "text-ink2";

  return (
    <div
      className={`rounded-xl border bg-card p-5 ${
        highlight ? "border-gold/50" : "border-line"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase tracking-wide text-gold">
          {clue.category ?? "Trivia"}
        </span>
        <span className="text-xs text-ink3">{formatDateLong(clue.date)}</span>
      </div>
      <p className="mt-2 text-base font-semibold text-ink">{clue.clue_text}</p>

      {showInput ? (
        <div className="mt-4 space-y-3">
          <input
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && answer.trim() && handle("submit")}
            placeholder="Type your answer…"
            className="w-full rounded-md border border-line bg-card2 px-3 py-2 text-lg"
            autoFocus={highlight}
          />
          <div className="flex gap-3">
            <button
              onClick={() => handle("submit")}
              disabled={busy || !answer.trim()}
              className="flex-1 rounded-xl bg-gold py-3 text-lg font-black text-board transition-opacity disabled:opacity-50"
            >
              {busy ? "Grading…" : `Submit for ${fmtMoney(clue.value)}`}
            </button>
            <button
              onClick={() => handle("pass")}
              disabled={busy}
              className="rounded-xl border-2 border-ink3/60 px-4 py-3 font-bold text-ink2 transition-colors hover:bg-ink3/10 disabled:opacity-50"
            >
              Pass
            </button>
          </div>
          {existing && (
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-ink3 hover:text-ink2"
            >
              Cancel
            </button>
          )}
        </div>
      ) : (
        existing && (
          <div className="mt-4 space-y-1">
            <div className={`text-sm font-bold ${resultTone}`}>
              {existing.result === "correct"
                ? "Correct ✓"
                : existing.result === "incorrect"
                  ? "Incorrect ✗"
                  : "Passed"}{" "}
              <span className="tabular-nums">{fmtMoney(existing.amount)}</span>
            </div>
            <div className="text-sm text-ink2">
              Accepted answer: <span className="font-semibold text-ink">{clue.correct_answer}</span>
            </div>
            {locked ? (
              <div className="text-xs text-ink3">Locked — your one edit is used.</div>
            ) : (
              <button
                onClick={() => {
                  setEditing(true);
                  setAnswer("");
                }}
                className="text-xs text-gold hover:underline"
              >
                Change answer (1 edit left)
              </button>
            )}
          </div>
        )
      )}

      {/* Fresh-submit feedback (before the row flips to history via refetch) */}
      {feedback && (
        <div className="mt-3 text-sm">
          {feedback.ok ? (
            <span
              className={
                feedback.result === "correct"
                  ? "text-up"
                  : feedback.result === "incorrect"
                    ? "text-down"
                    : "text-ink2"
              }
            >
              {feedback.result === "correct"
                ? `Correct! +${fmtMoney(feedback.amount)}`
                : feedback.result === "incorrect"
                  ? `Not quite. ${fmtMoney(feedback.amount)} — accepted: “${feedback.accepted}”`
                  : `Passed. Accepted answer: “${feedback.accepted}”`}
            </span>
          ) : (
            <span className="text-down">{feedback.error}</span>
          )}
        </div>
      )}
    </div>
  );
}
