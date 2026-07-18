"use client";

import { useState } from "react";
import { useScores } from "@/lib/useScores";
import { annualPivot, monthlyTotals, weeklyRows } from "@/lib/stats";
import {
  DAY_ABBREV,
  MONTHS,
  fmtMoney,
  parseDateStr,
  todayStr,
  weekStartStr,
} from "@/lib/rules";
import type { ResultCode } from "@/lib/types";

const TABS = ["Weekly", "Monthly", "Annual"] as const;
type Tab = (typeof TABS)[number];

function cell(result: ResultCode | null) {
  if (result === null) return <span className="text-ink3">·</span>;
  if (result === "correct") return <span title="Correct">✅</span>;
  if (result === "incorrect") return <span title="Incorrect">❌</span>;
  if (result === "pass") return <span className="text-xs font-bold text-ink2" title="Pass">P</span>;
  if (result === "correct_wager") return <span title="Won the wager">🎲✅</span>;
  return <span title="Lost the wager">🎲❌</span>;
}

export default function LeaderboardPage() {
  const { entries, loading, error } = useScores();
  const [tab, setTab] = useState<Tab>("Weekly");

  const today = todayStr();
  const year = Number(today.slice(0, 4));
  const month = Number(today.slice(5, 7));

  if (loading) return <p className="text-center text-sm text-ink3">Loading scores…</p>;
  if (error) return <p className="text-center text-sm text-down">Couldn’t load data: {error}</p>;

  const weekStart = weekStartStr(today);
  const weekly = weeklyRows(entries, weekStart);
  const monthly = monthlyTotals(entries, year, month);
  const annual = annualPivot(entries, year, month);
  const monthName = parseDateStr(today).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg border border-line bg-card p-1">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold transition-colors ${
                tab === t ? "bg-gold text-board" : "text-ink2 hover:text-ink"
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {tab === "Weekly" && (
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-4 text-lg font-bold">
            This Week <span className="text-sm font-normal text-ink3">(Mon–Sun)</span>
          </h2>
          {weekly.length === 0 ? (
            <p className="text-sm text-ink3">No scores this week yet — be the first!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink3">
                    <th className="pb-2 pr-3">Player</th>
                    {DAY_ABBREV.map((d) => (
                      <th key={d} className="pb-2 px-2 text-center">{d}</th>
                    ))}
                    <th className="pb-2 pl-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {weekly.map((row, i) => (
                    <tr key={row.player} className="border-t border-line">
                      <td className="py-2.5 pr-3 font-semibold">
                        {i === 0 && row.total > 0 && "👑 "}
                        {row.player}
                      </td>
                      {row.cells.map((c, j) => (
                        <td key={j} className="px-2 text-center">{cell(c)}</td>
                      ))}
                      <td
                        className={`py-2.5 pl-3 text-right font-bold tabular-nums ${
                          row.total > 0 ? "text-up" : row.total < 0 ? "text-down" : "text-ink2"
                        }`}
                      >
                        {fmtMoney(row.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === "Monthly" && (
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-4 text-lg font-bold">{monthName}</h2>
          {monthly.length === 0 ? (
            <p className="text-sm text-ink3">No scores this month yet.</p>
          ) : (
            <>
              {/* Podium */}
              <div className="mb-5 flex items-end justify-center gap-3">
                {[1, 0, 2].map((rank) => {
                  const p = monthly[rank];
                  if (!p) return null;
                  const heights = ["h-28", "h-20", "h-16"];
                  const medals = ["🥇", "🥈", "🥉"];
                  return (
                    <div key={p.player} className="flex w-28 flex-col items-center gap-1">
                      <span className="text-2xl">{medals[rank]}</span>
                      <span className="max-w-full truncate text-sm font-bold">{p.player}</span>
                      <span
                        className={`text-xs font-semibold tabular-nums ${
                          p.total >= 0 ? "text-up" : "text-down"
                        }`}
                      >
                        {fmtMoney(p.total)}
                      </span>
                      <div
                        className={`w-full rounded-t-lg border border-line bg-card2 ${heights[rank]} ${
                          rank === 0 ? "border-gold/60 bg-gold/15" : ""
                        }`}
                      />
                    </div>
                  );
                })}
              </div>

              <table className="w-full text-sm">
                <tbody>
                  {monthly.map((p, i) => (
                    <tr key={p.player} className="border-t border-line">
                      <td className="w-10 py-2 text-ink3 tabular-nums">{i + 1}</td>
                      <td className="py-2 font-semibold">{p.player}</td>
                      <td
                        className={`py-2 text-right font-bold tabular-nums ${
                          p.total > 0 ? "text-up" : p.total < 0 ? "text-down" : "text-ink2"
                        }`}
                      >
                        {fmtMoney(p.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}

      {tab === "Annual" && (
        <section className="rounded-2xl border border-line bg-card p-5">
          <h2 className="mb-4 text-lg font-bold">{year} Performance</h2>
          {annual.length === 0 ? (
            <p className="text-sm text-ink3">No scores this year yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-ink3">
                    <th className="pb-2 pr-3">Player</th>
                    {MONTHS.map((m) => (
                      <th key={m} className="px-2 pb-2 text-right">{m}</th>
                    ))}
                    <th className="pb-2 pl-3 text-right">YTD</th>
                  </tr>
                </thead>
                <tbody>
                  {annual.map((row) => (
                    <tr key={row.player} className="border-t border-line">
                      <td className="py-2 pr-3 font-semibold whitespace-nowrap">{row.player}</td>
                      {row.months.map((v, i) => (
                        <td key={i} className="px-2 py-2 text-right tabular-nums text-ink2">
                          {v === null ? "" : fmtMoney(v)}
                        </td>
                      ))}
                      <td
                        className={`py-2 pl-3 text-right font-bold tabular-nums ${
                          row.ytd > 0 ? "text-up" : row.ytd < 0 ? "text-down" : "text-ink2"
                        }`}
                      >
                        {fmtMoney(row.ytd)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
