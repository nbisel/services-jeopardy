"use client";

import { useEffect, useMemo, useState } from "react";
import SelfServe from "@/components/SelfServe";
import LoadingSpinner from "@/components/LoadingSpinner";
import HostGrid from "@/components/HostGrid";
import CatchUp from "@/components/CatchUp";
import ManagePlayers from "@/components/ManagePlayers";
import { useScores } from "@/lib/useScores";
import { missingForRange } from "@/lib/missing";
import {
  addDaysStr,
  dayName,
  dayValue,
  fmtMoney,
  formatDateLong,
  isSunday,
  maxEntryDateStr,
  todayStr,
  weekStartStr,
} from "@/lib/rules";

type Mode = "me" | "host" | "catchup";

const MODES: [Mode, string][] = [
  ["me", "My Score"],
  ["host", "Host Mode"],
  ["catchup", "Catch Up"],
];

export default function TodayPage() {
  const { players, entries, loading, error, refetch } = useScores();
  const [date, setDate] = useState(todayStr());
  const [mode, setMode] = useState<Mode>("me");
  const [showMissing, setShowMissing] = useState(false);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("sjt-mode");
    if (saved === "host" || saved === "me" || saved === "catchup") setMode(saved);
  }, []);

  function switchMode(m: Mode) {
    setMode(m);
    localStorage.setItem("sjt-mode", m);
  }

  const sunday = isSunday(date);
  const value = dayValue(date);

  // "Who hasn't played" — current week, up through today only.
  const today = todayStr();
  const weekStart = weekStartStr(today);
  const missingWeek = useMemo(() => {
    const active = players.filter((p) => p.active);
    return missingForRange(active, entries, weekStart, addDaysStr(today, 1));
  }, [players, entries, weekStart, today]);

  const behind = useMemo(
    () =>
      players
        .filter((p) => p.active)
        .map((p) => ({ player: p, dates: missingWeek.get(p.id) ?? [] }))
        .filter((x) => x.dates.length > 0),
    [players, missingWeek]
  );
  const missingToday = behind.filter((x) => x.dates.includes(today));

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      {/* Day card */}
      <section className="rounded-2xl border border-line bg-card p-6 text-center shadow-lg">
        <input
          type="date"
          value={date}
          max={maxEntryDateStr()}
          onChange={(e) => e.target.value && setDate(e.target.value)}
          className="mb-3 rounded-md border border-line bg-card2 px-3 py-1.5 text-sm text-ink2"
          aria-label="Entry date"
        />
        <h1 className="text-xl font-semibold text-ink2">{formatDateLong(date)}</h1>
        <div
          key={date}
          className="day-flip font-display mt-2 text-5xl font-black tracking-wide text-gold"
        >
          {sunday ? "🎲 Wager Day" : fmtMoney(value)}
        </div>
        <p className="mt-2 text-sm text-ink3">
          {sunday
            ? "Bet up to your weekly total. Fortune favors the bold."
            : `${dayName(date)}s are worth ${fmtMoney(value)} — get it right or pay the price.`}
        </p>
      </section>

      {/* Who hasn't played */}
      {!loading && !error && players.some((p) => p.active) && (
        <section className="rounded-xl border border-line bg-card px-4 py-3 text-sm">
          {behind.length === 0 ? (
            <p className="text-center text-up">✓ Everyone’s caught up this week.</p>
          ) : (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-ink2">
                  <span className="font-bold text-gold">{missingToday.length}</span>{" "}
                  {missingToday.length === 1 ? "player" : "players"} missing today ·{" "}
                  <span className="font-bold text-gold">{behind.length}</span> missing this week
                </p>
                <button
                  onClick={() => setShowMissing((s) => !s)}
                  className="shrink-0 rounded-md border border-line px-2 py-1 text-xs text-ink2 hover:bg-card2"
                >
                  {showMissing ? "Hide" : "Who?"}
                </button>
              </div>
              {showMissing && (
                <ul className="mt-2 space-y-1 border-t border-line pt-2 text-xs text-ink2">
                  {behind.map(({ player, dates }) => (
                    <li key={player.id}>
                      <span className="font-semibold">{player.name}</span>{" "}
                      <span className="text-ink3">
                        — {dates.length} day{dates.length === 1 ? "" : "s"}:{" "}
                        {dates.map((d) => dayName(d).slice(0, 3)).join(", ")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </section>
      )}

      {/* Mode toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-line bg-card p-1">
          {MODES.map(([m, label]) => (
            <button
              key={m}
              onClick={() => switchMode(m)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                mode === m ? "bg-gold text-board" : "text-ink2 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="rounded-2xl border border-line bg-card p-5">
        {loading ? (
          <LoadingSpinner label="Loading players" />
        ) : error ? (
          <p className="text-center text-sm text-down">Couldn’t load data: {error}</p>
        ) : mode === "me" ? (
          <SelfServe players={players} entries={entries} date={date} onSaved={refetch} />
        ) : mode === "host" ? (
          <HostGrid players={players} entries={entries} date={date} onSaved={refetch} />
        ) : (
          <CatchUp players={players} entries={entries} onSaved={refetch} />
        )}
      </section>

      {/* Manage players */}
      {!loading && !error && (
        <section className="rounded-2xl border border-line bg-card p-5">
          <button
            onClick={() => setShowManage((s) => !s)}
            className="flex w-full items-center justify-between text-sm font-semibold text-ink2 hover:text-ink"
          >
            <span>⚙️ Manage Players</span>
            <span className="text-ink3">{showManage ? "▴" : "▾"}</span>
          </button>
          {showManage && (
            <div className="mt-4">
              <ManagePlayers players={players} onChanged={refetch} />
            </div>
          )}
        </section>
      )}

      <p className="text-center text-xs text-ink3">
        Scores update live for everyone — no refresh needed.
      </p>
    </div>
  );
}
