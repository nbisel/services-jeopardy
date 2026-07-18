"use client";

import { useEffect, useState } from "react";
import SelfServe from "@/components/SelfServe";
import HostGrid from "@/components/HostGrid";
import { useScores } from "@/lib/useScores";
import {
  dayName,
  dayValue,
  fmtMoney,
  formatDateLong,
  isSunday,
  maxEntryDateStr,
  todayStr,
} from "@/lib/rules";

type Mode = "me" | "host";

export default function TodayPage() {
  const { players, entries, loading, error, refetch } = useScores();
  const [date, setDate] = useState(todayStr());
  const [mode, setMode] = useState<Mode>("me");

  useEffect(() => {
    const saved = localStorage.getItem("sjt-mode");
    if (saved === "host" || saved === "me") setMode(saved);
  }, []);

  function switchMode(m: Mode) {
    setMode(m);
    localStorage.setItem("sjt-mode", m);
  }

  const sunday = isSunday(date);
  const value = dayValue(date);

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
        <div className="mt-2 text-5xl font-black tracking-tight text-gold">
          {sunday ? "🎲 Wager Day" : fmtMoney(value)}
        </div>
        <p className="mt-2 text-sm text-ink3">
          {sunday
            ? "Bet up to your weekly total. Fortune favors the bold."
            : `${dayName(date)}s are worth ${fmtMoney(value)} — get it right or pay the price.`}
        </p>
      </section>

      {/* Mode toggle */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-line bg-card p-1">
          {(
            [
              ["me", "My Score"],
              ["host", "Host Mode"],
            ] as const
          ).map(([m, label]) => (
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
          <p className="text-center text-sm text-ink3">Loading players…</p>
        ) : error ? (
          <p className="text-center text-sm text-down">Couldn’t load data: {error}</p>
        ) : mode === "me" ? (
          <SelfServe players={players} entries={entries} date={date} onSaved={refetch} />
        ) : (
          <HostGrid players={players} entries={entries} date={date} onSaved={refetch} />
        )}
      </section>

      <p className="text-center text-xs text-ink3">
        Scores update live for everyone — no refresh needed.
      </p>
    </div>
  );
}
