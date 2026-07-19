"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { upsertScore } from "@/lib/api";
import { missingForRange } from "@/lib/missing";
import type { Entry, Player, ResultCode } from "@/lib/types";
import ResultControl, { type ResultPick } from "./ResultControl";
import {
  addDaysStr,
  computeAmount,
  dayValue,
  fmtMoney,
  isSunday,
  parseDateStr,
  todayStr,
  weekStartStr,
} from "@/lib/rules";

const WINDOWS = [
  { key: "week", label: "This week" },
  { key: "twoweeks", label: "Last 2 weeks" },
  { key: "month", label: "This month" },
] as const;
type WindowKey = (typeof WINDOWS)[number]["key"];

/** Hard cap so the grid can't grow unbounded. */
const MAX_WINDOW_DAYS = 31;

type CellState = { pick: ResultPick | null; wager: number };

function windowRange(key: WindowKey): { start: string; endExclusive: string } {
  const today = todayStr();
  const endExclusive = addDaysStr(today, 1);
  let start: string;
  if (key === "week") start = weekStartStr(today);
  else if (key === "twoweeks") start = addDaysStr(weekStartStr(today), -7);
  else start = `${today.slice(0, 7)}-01`;
  const floor = addDaysStr(endExclusive, -MAX_WINDOW_DAYS);
  if (start < floor) start = floor;
  return { start, endExclusive };
}

function fmtCol(date: string): string {
  return parseDateStr(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

function resultIcon(result: ResultCode): string {
  if (result === "correct") return "✅";
  if (result === "incorrect") return "❌";
  if (result === "pass") return "P";
  if (result === "correct_wager") return "🎲✅";
  return "🎲❌";
}

export default function CatchUp({
  players,
  entries,
  onSaved,
}: {
  players: Player[];
  entries: Entry[];
  onSaved: () => void;
}) {
  const active = useMemo(() => players.filter((p) => p.active), [players]);
  const [windowKey, setWindowKey] = useState<WindowKey>("week");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [cells, setCells] = useState<Record<string, CellState>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const initialized = useRef(false);

  const { start, endExclusive } = useMemo(() => windowRange(windowKey), [windowKey]);

  const missing = useMemo(
    () => missingForRange(active, entries, start, endExclusive),
    [active, entries, start, endExclusive]
  );

  // Pre-check players with outstanding entries — once on first load, and on window change.
  function precheck(windowStart: string, windowEnd: string) {
    const m = missingForRange(active, entries, windowStart, windowEnd);
    setSelected(new Set(active.filter((p) => (m.get(p.id)?.length ?? 0) > 0).map((p) => p.id)));
  }
  useEffect(() => {
    if (initialized.current || active.length === 0) return;
    initialized.current = true;
    precheck(start, endExclusive);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  function choosePreset(key: WindowKey) {
    setWindowKey(key);
    setCells({});
    setMessage(null);
    const r = windowRange(key);
    const m = missingForRange(active, entries, r.start, r.endExclusive);
    setSelected(new Set(active.filter((p) => (m.get(p.id)?.length ?? 0) > 0).map((p) => p.id)));
  }

  function togglePlayer(id: string) {
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const selectedPlayers = active.filter((p) => selected.has(p.id));

  // Columns: dates in the window missing for at least one selected player.
  const columns = useMemo(() => {
    const dates = new Set<string>();
    for (const p of selectedPlayers) {
      for (const d of missing.get(p.id) ?? []) dates.add(d);
    }
    return [...dates].sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing, selected, active]);

  const entryFor = useMemo(() => {
    const map = new Map<string, Entry>();
    for (const e of entries) {
      if (e.date >= start && e.date < endExclusive) map.set(`${e.player_id}|${e.date}`, e);
    }
    return map;
  }, [entries, start, endExclusive]);

  const key = (pid: string, date: string) => `${pid}|${date}`;

  /**
   * Amount a filled cell would save. For Sundays the wager is capped against
   * the week's Mon–Sat total including *pending* picks for earlier dates, so
   * a catch-up covering Mon–Sun computes a live cap as cells are filled.
   */
  function pendingAmount(pid: string, date: string): number | null {
    const cell = cells[key(pid, date)];
    if (!cell?.pick) return null;
    if (!isSunday(date)) return computeAmount(cell.pick, dayValue(date));
    const cap = capFor(pid, date);
    const w = Math.min(cell.wager, cap);
    return cell.pick === "correct" ? w : -w;
  }

  /** Wager cap from saved entries plus pending picks strictly before `date`. */
  function capFor(pid: string, date: string): number {
    const ws = weekStartStr(date);
    let total = 0;
    for (let d = ws; d < date; d = addDaysStr(d, 1)) {
      const e = entryFor.get(key(pid, d)) ?? entries.find((x) => x.player_id === pid && x.date === d);
      if (e) {
        total += e.amount;
      } else {
        const cell = cells[key(pid, d)];
        if (cell?.pick && !isSunday(d)) total += computeAmount(cell.pick, dayValue(d));
      }
    }
    return Math.abs(total);
  }

  /** Mon–Sat dates before this Sunday with a saved entry or a pending pick. */
  function weekdaysCovered(pid: string, date: string): number {
    const ws = weekStartStr(date);
    let n = 0;
    for (let d = ws; d < date; d = addDaysStr(d, 1)) {
      const hasEntry = entries.some((x) => x.player_id === pid && x.date === d);
      if (hasEntry || cells[key(pid, d)]?.pick) n++;
    }
    return n;
  }

  function setPick(pid: string, date: string, pick: ResultPick) {
    setCells((c) => ({
      ...c,
      [key(pid, date)]: { wager: c[key(pid, date)]?.wager ?? 0, pick },
    }));
  }
  function setWager(pid: string, date: string, wager: number) {
    setCells((c) => ({
      ...c,
      [key(pid, date)]: { pick: c[key(pid, date)]?.pick ?? null, wager },
    }));
  }

  /** Filled, submittable cells for one player, oldest date first. */
  function filledCells(pid: string): { date: string; cell: CellState }[] {
    return columns
      .filter((d) => {
        const cell = cells[key(pid, d)];
        if (!cell?.pick) return false;
        const existing = entryFor.get(key(pid, d));
        if (existing && existing.edit_count >= 1) return false;
        if (isSunday(d) && Math.min(cell.wager, capFor(pid, d)) === 0) return false;
        return true;
      })
      .map((d) => ({ date: d, cell: cells[key(pid, d)]! }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  const pendingCount = selectedPlayers.reduce((n, p) => n + filledCells(p.id).length, 0);

  async function submitAll() {
    setBusy(true);
    setMessage(null);
    const failures: string[] = [];
    let saved = 0;

    for (const p of selectedPlayers) {
      // Chronological per player: Sunday wager caps depend on that week's
      // Mon–Sat amounts already being saved.
      const batch = filledCells(p.id);
      const savedAmounts = new Map<string, number>();

      for (const { date, cell } of batch) {
        let amount: number;
        let wager: number | null = null;
        let result: ResultCode;

        if (isSunday(date)) {
          const ws = weekStartStr(date);
          let total = 0;
          for (let d = ws; d < date; d = addDaysStr(d, 1)) {
            const e = entries.find((x) => x.player_id === p.id && x.date === d);
            if (e) total += e.amount;
            else if (savedAmounts.has(d)) total += savedAmounts.get(d)!;
          }
          const cap = Math.abs(total);
          const w = Math.min(cell.wager, cap);
          if (w === 0) continue; // cap collapsed to zero mid-batch — nothing to wager
          amount = cell.pick === "correct" ? w : -w;
          wager = w;
          result = cell.pick === "correct" ? "correct_wager" : "incorrect_wager";
        } else {
          amount = computeAmount(cell.pick!, dayValue(date));
          result = cell.pick!;
        }

        const res = await upsertScore({ playerId: p.id, date, result, amount, wager });
        if (res.ok) {
          saved++;
          savedAmounts.set(date, amount);
        } else {
          failures.push(`${p.name} ${fmtCol(date)} (${res.error})`);
        }
      }
    }

    setBusy(false);
    setCells({});
    if (failures.length === 0) {
      setMessage({ kind: "ok", text: `Saved ${saved} score${saved === 1 ? "" : "s"}! 🎉` });
    } else {
      setMessage({
        kind: "err",
        text: `Saved ${saved}, but failed for: ${failures.join("; ")}`,
      });
    }
    onSaved();
  }

  if (active.length === 0) {
    return (
      <p className="text-sm text-ink2">
        No players yet — switch to “My Score” and add the first player.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Step 1: players */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">
          Who’s catching up?
        </div>
        <div className="flex flex-wrap gap-2">
          {active.map((p) => {
            const on = selected.has(p.id);
            const behind = (missing.get(p.id)?.length ?? 0) > 0;
            return (
              <button
                key={p.id}
                onClick={() => togglePlayer(p.id)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  on
                    ? "border-gold bg-gold text-board"
                    : "border-line text-ink2 hover:bg-card2"
                }`}
              >
                {p.name}
                {behind && !on && <span className="ml-1 text-down">•</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: window */}
      <div>
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink3">
          How far back?
        </div>
        <div className="inline-flex rounded-lg border border-line bg-card p-1">
          {WINDOWS.map((w) => (
            <button
              key={w.key}
              onClick={() => choosePreset(w.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-semibold transition-colors ${
                windowKey === w.key ? "bg-gold text-board" : "text-ink2 hover:text-ink"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      {/* Step 3: grid */}
      {selectedPlayers.length === 0 ? (
        <p className="text-sm text-ink3">Select at least one player above.</p>
      ) : columns.length === 0 ? (
        <p className="text-sm text-up">
          ✓ Everyone selected is fully caught up for this window.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-line">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink3">
                <th className="sticky left-0 bg-card px-3 py-2">Player</th>
                {columns.map((d) => (
                  <th key={d} className="px-3 py-2 whitespace-nowrap">
                    {fmtCol(d)}
                    <span className="ml-1 font-normal normal-case">
                      {isSunday(d) ? "🎲" : fmtMoney(dayValue(d))}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {selectedPlayers.map((p) => (
                <tr key={p.id} className="border-t border-line align-top">
                  <td className="sticky left-0 bg-card px-3 py-2.5 font-semibold whitespace-nowrap">
                    {p.name}
                  </td>
                  {columns.map((d) => {
                    const existing = entryFor.get(key(p.id, d));
                    const locked = !!existing && existing.edit_count >= 1;
                    const cell = cells[key(p.id, d)];
                    const sunday = isSunday(d);
                    const amount = pendingAmount(p.id, d);
                    const covered = sunday ? weekdaysCovered(p.id, d) : 6;

                    if (locked) {
                      return (
                        <td key={d} className="px-3 py-2.5">
                          <div className="text-xs text-ink3">
                            {resultIcon(existing!.result)} {fmtMoney(existing!.amount)}
                          </div>
                          <div className="text-xs text-ink3">edit used</div>
                        </td>
                      );
                    }
                    return (
                      <td key={d} className="px-3 py-2.5">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <ResultControl
                            sunday={sunday}
                            cap={sunday ? capFor(p.id, d) : 0}
                            pick={cell?.pick ?? null}
                            wager={cell?.wager ?? 0}
                            onPick={(pick) => setPick(p.id, d, pick)}
                            onWager={(w) => setWager(p.id, d, w)}
                          />
                        </div>
                        {existing && (
                          <div className="mt-1 text-xs text-gold">
                            logged {fmtMoney(existing.amount)} — resubmit replaces it
                          </div>
                        )}
                        {sunday && capFor(p.id, d) > 0 && covered < 6 && (
                          <div className="mt-1 text-xs text-gold">
                            ⚠ {covered}/6 weekdays logged — cap may move
                          </div>
                        )}
                        {amount !== null && (
                          <div
                            className={`mt-1 text-xs font-bold ${
                              amount > 0 ? "text-up" : amount < 0 ? "text-down" : "text-ink3"
                            }`}
                          >
                            {fmtMoney(amount)}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button
        onClick={submitAll}
        disabled={busy || pendingCount === 0}
        className="w-full rounded-xl bg-gold py-3 text-lg font-black text-board transition-opacity disabled:opacity-40"
      >
        {busy
          ? "Saving…"
          : pendingCount === 0
            ? "Fill in at least one result"
            : `Submit ${pendingCount} score${pendingCount === 1 ? "" : "s"}`}
      </button>

      {message && (
        <p
          className={`text-center text-sm font-semibold ${
            message.kind === "ok" ? "text-up" : "text-down"
          }`}
        >
          {message.text}
        </p>
      )}
    </div>
  );
}
