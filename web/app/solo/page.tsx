"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useClueScores } from "@/lib/useClueScores";
import { supabase } from "@/lib/supabase";
import { soloMonthlyBadges } from "@/lib/badges";
import { todayStr } from "@/lib/rules";
import SoloPlay from "@/components/SoloPlay";
import SoloLeaderboard from "@/components/SoloLeaderboard";
import BadgesView from "@/components/BadgesView";
import LoadingSpinner from "@/components/LoadingSpinner";

type Tab = "play" | "leaderboard" | "badges";

export default function SoloTriviaPage() {
  const { players, entries, clueDays, loading, error, refetch } = useClueScores();
  const [tab, setTab] = useState<Tab>("play");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [monthOffset, setMonthOffset] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("sjt-solo-tab");
    if (saved === "play" || saved === "leaderboard" || saved === "badges") setTab(saved);
  }, []);

  function switchTab(t: Tab) {
    setTab(t);
    localStorage.setItem("sjt-solo-tab", t);
  }

  // Lightweight count of clues awaiting review (drives the Manage Clues link).
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("clue_pool")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending")
      .then(({ count }) => {
        if (!cancelled) setPendingCount(count ?? 0);
      });
    return () => {
      cancelled = true;
    };
  }, [clueDays]);

  const today = todayStr();
  const base = new Date(Number(today.slice(0, 4)), Number(today.slice(5, 7)) - 1 + monthOffset, 1);
  const badgeYear = base.getFullYear();
  const badgeMonth = base.getMonth() + 1;
  const badgeMonthLabel = base.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const badges = useMemo(
    () => soloMonthlyBadges(entries, badgeYear, badgeMonth),
    [entries, badgeYear, badgeMonth]
  );

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-wide text-gold">Solo Trivia</h1>
        <Link
          href="/solo/manage"
          className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink2 hover:bg-card2"
        >
          Review pending clues{pendingCount !== null ? ` (${pendingCount})` : ""}
        </Link>
      </div>

      <p className="text-sm text-ink3">
        Solo, self-graded trivia — one shared clue a day, catch up on any you missed this week.
        Scores and badges are completely separate from the calendar game.
      </p>

      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-line bg-card p-1">
          {(
            [
              ["play", "Play"],
              ["leaderboard", "Leaderboard"],
              ["badges", "Badges"],
            ] as const
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => switchTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === t ? "bg-gold text-board" : "text-ink2 hover:text-ink"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <LoadingSpinner label="Loading trivia" />
      ) : error ? (
        <p className="text-center text-sm text-down">Couldn’t load data: {error}</p>
      ) : tab === "play" ? (
        <SoloPlay players={players} entries={entries} clueDays={clueDays} onSaved={refetch} />
      ) : tab === "leaderboard" ? (
        <SoloLeaderboard entries={entries} />
      ) : (
        <BadgesView
          title="🏅 Solo Trivia Badges"
          badges={badges}
          monthLabel={badgeMonthLabel}
          monthOffset={monthOffset}
          onPrev={() => setMonthOffset((o) => o - 1)}
          onNext={() => setMonthOffset((o) => Math.min(0, o + 1))}
          emptyLabel={`No Solo Trivia badges earned in ${badgeMonthLabel} — no trivia played.`}
        />
      )}
    </div>
  );
}
