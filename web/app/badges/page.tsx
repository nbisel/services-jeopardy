"use client";

import { useMemo, useState } from "react";
import { useScores } from "@/lib/useScores";
import { monthlyBadges } from "@/lib/badges";
import { todayStr } from "@/lib/rules";
import NamePlate from "@/components/NamePlate";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function BadgesPage() {
  const { entries, loading, error } = useScores();
  const [monthOffset, setMonthOffset] = useState(0);

  const today = todayStr();
  const base = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + monthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth() + 1;
  const monthLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const badges = useMemo(() => monthlyBadges(entries, year, month), [entries, year, month]);
  const awarded = badges.filter((b) => b.winners.length > 0);

  if (loading) return <LoadingSpinner label="Loading badges" />;
  if (error) return <p className="text-center text-sm text-down">Couldn’t load data: {error}</p>;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold">🏅 Monthly Badges</h1>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setMonthOffset((o) => o - 1)}
            className="rounded-md border border-line px-2 py-1 text-ink2 hover:bg-card2"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="min-w-32 text-center font-semibold">{monthLabel}</span>
          <button
            onClick={() => setMonthOffset((o) => Math.min(0, o + 1))}
            disabled={monthOffset === 0}
            className="rounded-md border border-line px-2 py-1 text-ink2 hover:bg-card2 disabled:opacity-30"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {awarded.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink3">
          No badges earned in {monthLabel} — no scores logged.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {badges.map((b) => (
            <div
              key={b.key}
              className={`rounded-xl border p-4 ${
                b.winners.length > 0 ? "border-line bg-card" : "border-line/50 bg-card/40"
              }`}
            >
              <div className="text-2xl">{b.emoji}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink3">{b.label}</div>
              <p className="mt-0.5 text-xs text-ink3">{b.description}</p>
              {b.winners.length === 0 ? (
                <p className="mt-2 text-sm text-ink3">Nobody qualified this month.</p>
              ) : (
                <div className="mt-2 space-y-1.5">
                  {b.winners.map((w) => (
                    <div key={w.player} className="flex flex-wrap items-center gap-2">
                      <NamePlate name={w.player} />
                      <span className="font-display text-sm font-bold text-gold">{w.stat}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
