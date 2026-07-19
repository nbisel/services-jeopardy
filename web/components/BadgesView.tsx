"use client";

import type { Badge } from "@/lib/badges";
import NamePlate from "@/components/NamePlate";

/**
 * Full monthly-badge view: a title + month prev/next selector over a card grid.
 * Shared by the main Badges page and the Solo Trivia Badges tab.
 */
export default function BadgesView({
  title,
  badges,
  monthLabel,
  monthOffset,
  onPrev,
  onNext,
  emptyLabel,
}: {
  title: string;
  badges: Badge[];
  monthLabel: string;
  monthOffset: number;
  onPrev: () => void;
  onNext: () => void;
  emptyLabel: string;
}) {
  const awarded = badges.filter((b) => b.winners.length > 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">{title}</h2>
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={onPrev}
            className="rounded-md border border-line px-2 py-1 text-ink2 hover:bg-card2"
            aria-label="Previous month"
          >
            ←
          </button>
          <span className="min-w-32 text-center font-semibold">{monthLabel}</span>
          <button
            onClick={onNext}
            disabled={monthOffset === 0}
            className="rounded-md border border-line px-2 py-1 text-ink2 hover:bg-card2 disabled:opacity-30"
            aria-label="Next month"
          >
            →
          </button>
        </div>
      </div>

      {awarded.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink3">{emptyLabel}</p>
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
