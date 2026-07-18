"use client";

import { useEffect, useMemo, useState } from "react";
import PlayerPicker from "./PlayerPicker";
import { upsertScore } from "@/lib/api";
import type { Entry, Player } from "@/lib/types";
import {
  computeAmount,
  dayValue,
  fmtMoney,
  isSunday,
  maxWager,
} from "@/lib/rules";

type Pick = "correct" | "incorrect" | "pass";

const STORAGE_KEY = "sjt-player";

export default function SelfServe({
  players,
  entries,
  date,
  onSaved,
}: {
  players: Player[];
  entries: Entry[];
  date: string;
  onSaved: () => void;
}) {
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [pick, setPick] = useState<Pick | null>(null);
  const [wager, setWager] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setPlayerId(saved);
  }, []);

  // Reset the in-progress selection when the player or date changes
  useEffect(() => {
    setPick(null);
    setWager(0);
    setMessage(null);
  }, [playerId, date]);

  const sunday = isSunday(date);
  const value = dayValue(date);
  const existing = useMemo(
    () => entries.find((e) => e.player_id === playerId && e.date === date),
    [entries, playerId, date]
  );
  const locked = !!existing && existing.edit_count >= 1;
  const cap = useMemo(
    () => (sunday && playerId ? maxWager(entries, playerId, date) : 0),
    [sunday, playerId, entries, date]
  );

  const amount = sunday
    ? pick === "correct"
      ? Math.min(wager, cap)
      : -Math.min(wager, cap)
    : pick
      ? computeAmount(pick, value)
      : 0;

  async function save() {
    if (!playerId || !pick) return;
    setBusy(true);
    setMessage(null);
    const res = await upsertScore({
      playerId,
      date,
      result: sunday ? (pick === "correct" ? "correct_wager" : "incorrect_wager") : pick,
      amount,
      wager: sunday ? Math.min(wager, cap) : null,
    });
    setBusy(false);
    if (res.ok) {
      setMessage({
        kind: "ok",
        text: `Saved ${fmtMoney(amount)}${existing ? " (replaced your earlier entry)" : ""}!`,
      });
      setPick(null);
      onSaved();
    } else {
      setMessage({ kind: "err", text: res.error });
    }
  }

  function choose(id: string) {
    setPlayerId(id);
    localStorage.setItem(STORAGE_KEY, id);
  }

  const btn = (selected: boolean, tone: "up" | "down" | "muted") => {
    const tones = {
      up: selected
        ? "border-up bg-up text-board"
        : "border-up/50 text-up hover:bg-up/10",
      down: selected
        ? "border-down bg-down text-board"
        : "border-down/50 text-down hover:bg-down/10",
      muted: selected
        ? "border-ink3 bg-ink3 text-board"
        : "border-ink3/60 text-ink2 hover:bg-ink3/10",
    };
    return `flex-1 rounded-xl border-2 px-4 py-4 text-center font-bold transition-colors ${tones[tone]}`;
  };

  return (
    <div className="space-y-4">
      <PlayerPicker players={players} value={playerId} onChange={choose} onPlayerAdded={onSaved} />

      {playerId && (
        <>
          {existing && (
            <p
              className={`rounded-md border px-3 py-2 text-sm ${
                locked
                  ? "border-down/40 bg-down/10 text-down"
                  : "border-gold/40 bg-gold/10 text-gold"
              }`}
            >
              {locked
                ? `Locked in: ${fmtMoney(existing.amount)} — this date's score was already edited once.`
                : `Logged ${fmtMoney(existing.amount)} for this date. Saving again replaces it (1 edit allowed).`}
            </p>
          )}

          {!locked &&
            (sunday ? (
              cap === 0 ? (
                <p className="text-sm text-ink2">
                  No Mon–Sat games this week yet — nothing to wager. 🎲
                </p>
              ) : (
                <div className="space-y-3">
                  <label className="block text-sm text-ink2">
                    Your wager (up to <span className="font-bold text-gold">{fmtMoney(cap)}</span>,
                    your weekly total)
                    <input
                      type="number"
                      min={0}
                      max={cap}
                      value={wager}
                      onChange={(e) =>
                        setWager(Math.max(0, Math.min(cap, Number(e.target.value) || 0)))
                      }
                      className="mt-1 w-full rounded-md border border-line bg-card2 px-3 py-2 text-lg font-bold"
                    />
                  </label>
                  <div className="flex gap-3">
                    <button className={btn(pick === "correct", "up")} onClick={() => setPick("correct")}>
                      Got it ✓<div className="text-sm font-normal">+{fmtMoney(wager)}</div>
                    </button>
                    <button className={btn(pick === "incorrect", "down")} onClick={() => setPick("incorrect")}>
                      Missed ✗<div className="text-sm font-normal">-{fmtMoney(wager)}</div>
                    </button>
                  </div>
                </div>
              )
            ) : (
              <div className="flex gap-3">
                <button className={btn(pick === "correct", "up")} onClick={() => setPick("correct")}>
                  Correct ✓<div className="text-sm font-normal">+{fmtMoney(value)}</div>
                </button>
                <button className={btn(pick === "incorrect", "down")} onClick={() => setPick("incorrect")}>
                  Incorrect ✗<div className="text-sm font-normal">-{fmtMoney(value)}</div>
                </button>
                <button className={btn(pick === "pass", "muted")} onClick={() => setPick("pass")}>
                  Pass<div className="text-sm font-normal">$0</div>
                </button>
              </div>
            ))}

          {!locked && pick && (
            <button
              onClick={save}
              disabled={busy || (sunday && wager === 0)}
              className="w-full rounded-xl bg-gold py-3 text-lg font-black text-board transition-opacity disabled:opacity-50"
            >
              {busy ? "Saving…" : `Save ${fmtMoney(amount)}`}
            </button>
          )}
          {sunday && pick && wager === 0 && !locked && (
            <p className="text-center text-sm text-ink3">Set a wager above zero to save.</p>
          )}

          {message && (
            <p
              className={`text-center text-sm font-semibold ${
                message.kind === "ok" ? "text-up" : "text-down"
              }`}
            >
              {message.text}
            </p>
          )}
        </>
      )}
    </div>
  );
}
