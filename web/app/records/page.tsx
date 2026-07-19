"use client";

import { useMemo, useState } from "react";
import { useScores } from "@/lib/useScores";
import { headToHead, records, streaks } from "@/lib/stats";
import { computeAwardsForRange, tiedWinners, type RangeAggregate } from "@/lib/badges";
import { fmtMoney, todayStr } from "@/lib/rules";
import NamePlate from "@/components/NamePlate";
import LoadingSpinner from "@/components/LoadingSpinner";

type YearAward = { label: string; emoji: string; winners: { player: string; stat: string }[] };

function yearAwards(aggs: RangeAggregate[]): YearAward[] {
  return [
    {
      label: "Top winnings",
      emoji: "👑",
      winners: tiedWinners(aggs, (x) => x.total).map(({ agg }) => ({
        player: agg.player,
        stat: fmtMoney(agg.total),
      })),
    },
    {
      label: "Most correct answers",
      emoji: "🎯",
      winners: tiedWinners(aggs, (x) => x.correct).map(({ agg }) => ({
        player: agg.player,
        stat: `${agg.correct} correct`,
      })),
    },
    {
      label: "Longest streak",
      emoji: "🔥",
      winners: tiedWinners(
        aggs.filter((x) => x.longestStreak > 0),
        (x) => x.longestStreak
      ).map(({ agg }) => ({
        player: agg.player,
        stat: `${agg.longestStreak} in a row`,
      })),
    },
    {
      label: "Boldest Sunday wagers",
      emoji: "🎲",
      winners: tiedWinners(aggs, (x) => x.avgRiskPct).map(({ agg }) => ({
        player: agg.player,
        stat: `${agg.avgRiskPct}% of bankroll avg`,
      })),
    },
  ];
}

export default function RecordsPage() {
  const { players, entries, loading, error } = useScores();
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const streakList = useMemo(() => streaks(entries), [entries]);
  const recordList = useMemo(() => records(entries), [entries]);
  const h2h = useMemo(
    () => (a && b && a !== b ? headToHead(entries, a, b) : null),
    [entries, a, b]
  );

  // Hall of Champions: one card per calendar year in the data, newest first.
  const currentYear = Number(todayStr().slice(0, 4));
  const championYears = useMemo(() => {
    const years = [...new Set(entries.map((e) => Number(e.date.slice(0, 4))))].sort(
      (x, y) => y - x
    );
    return years.map((year) => ({
      year,
      awards: yearAwards([
        ...computeAwardsForRange(entries, `${year}-01-01`, `${year + 1}-01-01`).values(),
      ]),
    }));
  }, [entries]);

  if (loading) return <LoadingSpinner label="Loading records" />;
  if (error) return <p className="text-center text-sm text-down">Couldn’t load data: {error}</p>;
  if (entries.length === 0)
    return <p className="text-center text-sm text-ink3">No scores yet — records will appear once the games begin.</p>;

  const pct = (v: number | null) => (v === null ? "—" : `${Math.round(v * 100)}%`);

  return (
    <div className="space-y-5">
      {/* Streaks */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-1 text-lg font-bold">🔥 Streaks</h2>
        <p className="mb-4 text-xs text-ink3">
          Consecutive correct answers. Wrong answers, lost wagers, and passes reset the count.
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide text-ink3">
              <th className="pb-2">Player</th>
              <th className="pb-2 text-right">Current</th>
              <th className="pb-2 text-right">Longest</th>
            </tr>
          </thead>
          <tbody>
            {streakList.map((s) => (
              <tr key={s.player} className="border-t border-line">
                <td className="py-2">
                  <NamePlate name={s.player} />
                </td>
                <td className="py-2 text-right tabular-nums">
                  {s.current > 0 ? (
                    <span className="font-bold text-gold">{s.current} 🔥</span>
                  ) : (
                    <span className="text-ink3">0</span>
                  )}
                </td>
                <td className="py-2 text-right tabular-nums text-ink2">{s.longest}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Hall of fame */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-4 text-lg font-bold">🏛️ Hall of Fame</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {recordList.map((r) => (
            <div key={r.label} className="rounded-xl border border-line bg-card2 p-4">
              <div className="text-2xl">{r.emoji}</div>
              <div className="mt-1 text-xs uppercase tracking-wide text-ink3">{r.label}</div>
              <div className="mt-1.5">
                <NamePlate name={r.player} />
              </div>
              <div className="mt-1 text-sm text-ink2">{r.detail}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Head to head */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-4 text-lg font-bold">⚔️ Head to Head</h2>
        <div className="mb-4 flex items-center gap-3">
          <select
            value={a}
            onChange={(e) => setA(e.target.value)}
            className="flex-1 rounded-md border border-line bg-card2 px-3 py-2 text-sm"
          >
            <option value="">Pick a player…</option>
            {players.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
          <span className="text-sm font-bold text-ink3">vs</span>
          <select
            value={b}
            onChange={(e) => setB(e.target.value)}
            className="flex-1 rounded-md border border-line bg-card2 px-3 py-2 text-sm"
          >
            <option value="">Pick a player…</option>
            {players.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </div>

        {a && b && a === b && <p className="text-sm text-ink3">Pick two different players.</p>}

        {h2h && (
          <div className="space-y-3">
            <div className="text-center text-sm text-ink3">
              {h2h.daysBothPlayed} day{h2h.daysBothPlayed === 1 ? "" : "s"} played head-to-head
              {h2h.ties > 0 && ` · ${h2h.ties} tie${h2h.ties === 1 ? "" : "s"}`}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: a, wins: h2h.aWins, total: h2h.aTotal, rate: h2h.aWinRate, ahead: h2h.aWins > h2h.bWins },
                { name: b, wins: h2h.bWins, total: h2h.bTotal, rate: h2h.bWinRate, ahead: h2h.bWins > h2h.aWins },
              ].map((s) => (
                <div
                  key={s.name}
                  className={`rounded-xl border p-4 text-center ${
                    s.ahead ? "border-gold/60 bg-gold/10" : "border-line bg-card2"
                  }`}
                >
                  <div>
                    {s.ahead && "👑 "}
                    <NamePlate name={s.name} />
                  </div>
                  <div className="mt-2 text-3xl font-black tabular-nums text-gold">{s.wins}</div>
                  <div className="text-xs uppercase tracking-wide text-ink3">days won</div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <div className={`font-bold tabular-nums ${s.total >= 0 ? "text-up" : "text-down"}`}>
                        {fmtMoney(s.total)}
                      </div>
                      <div className="text-xs text-ink3">all-time</div>
                    </div>
                    <div>
                      <div className="font-bold tabular-nums">{pct(s.rate)}</div>
                      <div className="text-xs text-ink3">correct rate</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Hall of Champions */}
      <section className="rounded-2xl border border-line bg-card p-5">
        <h2 className="mb-1 text-lg font-bold">🏆 Hall of Champions</h2>
        <p className="mb-4 text-xs text-ink3">The best of each year, by the numbers.</p>
        <div className="space-y-4">
          {championYears.map(({ year, awards }) => (
            <div key={year} className="rounded-xl border border-line bg-card2 p-4">
              <div className="font-display mb-3 text-xl font-black tracking-wide text-gold">
                {year}
                {year === currentYear && (
                  <span className="ml-2 align-middle text-xs font-semibold uppercase tracking-wide text-ink3">
                    in progress
                  </span>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {awards
                  .filter((aw) => aw.winners.length > 0)
                  .map((aw) => (
                    <div key={aw.label}>
                      <div className="text-xs uppercase tracking-wide text-ink3">
                        {aw.emoji} {aw.label}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {aw.winners.map((w) => (
                          <span key={w.player} className="flex items-center gap-1.5">
                            <NamePlate name={w.player} />
                            <span className="font-display text-sm font-bold text-gold">
                              {w.stat}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
