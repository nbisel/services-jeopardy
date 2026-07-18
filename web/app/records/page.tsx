"use client";

import { useMemo, useState } from "react";
import { useScores } from "@/lib/useScores";
import { headToHead, records, streaks } from "@/lib/stats";
import { fmtMoney } from "@/lib/rules";

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

  if (loading) return <p className="text-center text-sm text-ink3">Loading records…</p>;
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
                <td className="py-2 font-semibold">{s.player}</td>
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
              <div className="mt-1 text-lg font-black text-gold">{r.player}</div>
              <div className="text-sm text-ink2">{r.detail}</div>
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
                  <div className="text-lg font-black">{s.ahead && "👑 "}{s.name}</div>
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
    </div>
  );
}
