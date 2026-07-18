"use client";

import { useEffect, useMemo, useState } from "react";
import { upsertScore } from "@/lib/api";
import type { Entry, Player } from "@/lib/types";
import { computeAmount, dayValue, fmtMoney, isSunday, maxWager } from "@/lib/rules";

type Pick = "correct" | "incorrect" | "pass";
type RowState = { pick: Pick | null; wager: number };

export default function HostGrid({
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
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    setRows({});
    setMessage(null);
  }, [date]);

  const sunday = isSunday(date);
  const value = dayValue(date);

  const info = useMemo(() => {
    const map = new Map<
      string,
      { existing: Entry | undefined; locked: boolean; cap: number }
    >();
    for (const p of players) {
      const existing = entries.find((e) => e.player_id === p.id && e.date === date);
      map.set(p.id, {
        existing,
        locked: !!existing && existing.edit_count >= 1,
        cap: sunday ? maxWager(entries, p.id, date) : 0,
      });
    }
    return map;
  }, [players, entries, date, sunday]);

  function setPick(id: string, pick: Pick | null) {
    setRows((r) => ({ ...r, [id]: { wager: r[id]?.wager ?? 0, pick } }));
  }
  function setWager(id: string, wager: number) {
    setRows((r) => ({ ...r, [id]: { pick: r[id]?.pick ?? null, wager } }));
  }

  function amountFor(id: string): number | null {
    const row = rows[id];
    if (!row?.pick) return null;
    if (sunday) {
      const cap = info.get(id)?.cap ?? 0;
      const w = Math.min(row.wager, cap);
      return row.pick === "correct" ? w : -w;
    }
    return computeAmount(row.pick, value);
  }

  const pending = players.filter((p) => {
    const st = info.get(p.id);
    const row = rows[p.id];
    if (!row?.pick || st?.locked) return false;
    if (sunday && Math.min(row.wager, st?.cap ?? 0) === 0) return false;
    return true;
  });

  async function submitAll() {
    setBusy(true);
    setMessage(null);
    const failures: string[] = [];
    let saved = 0;
    for (const p of pending) {
      const row = rows[p.id]!;
      const amount = amountFor(p.id)!;
      const res = await upsertScore({
        playerId: p.id,
        date,
        result: sunday
          ? row.pick === "correct"
            ? "correct_wager"
            : "incorrect_wager"
          : row.pick!,
        amount,
        wager: sunday ? Math.min(row.wager, info.get(p.id)?.cap ?? 0) : null,
      });
      if (res.ok) saved++;
      else failures.push(`${p.name} (${res.error})`);
    }
    setBusy(false);
    setRows({});
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

  const seg = (selected: boolean, tone: "up" | "down" | "muted") => {
    const tones = {
      up: selected ? "bg-up text-board" : "text-up hover:bg-up/10",
      down: selected ? "bg-down text-board" : "text-down hover:bg-down/10",
      muted: selected ? "bg-ink3 text-board" : "text-ink2 hover:bg-ink3/10",
    };
    return `rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${tones[tone]}`;
  };

  if (players.length === 0) {
    return (
      <p className="text-sm text-ink2">
        No players yet — switch to “My Score” and add the first player.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="divide-y divide-line rounded-xl border border-line">
        {players.map((p) => {
          const st = info.get(p.id)!;
          const row = rows[p.id];
          const amount = amountFor(p.id);
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
              <div className="min-w-28 flex-1">
                <div className="font-semibold">{p.name}</div>
                {st.existing && (
                  <div className={`text-xs ${st.locked ? "text-down" : "text-gold"}`}>
                    {st.locked
                      ? `locked: ${fmtMoney(st.existing.amount)}`
                      : `logged ${fmtMoney(st.existing.amount)} — resubmit replaces it`}
                  </div>
                )}
              </div>

              {st.locked ? (
                <span className="text-xs text-ink3">edit used</span>
              ) : sunday ? (
                st.cap === 0 ? (
                  <span className="text-xs text-ink3">no weekly total — can’t wager</span>
                ) : (
                  <>
                    <input
                      type="number"
                      min={0}
                      max={st.cap}
                      placeholder="0"
                      value={row?.wager || ""}
                      onChange={(e) =>
                        setWager(p.id, Math.max(0, Math.min(st.cap, Number(e.target.value) || 0)))
                      }
                      className="w-24 rounded-md border border-line bg-card2 px-2 py-1.5 text-sm"
                    />
                    <span className="text-xs text-ink3">max {fmtMoney(st.cap)}</span>
                    <div className="flex gap-1">
                      <button className={seg(row?.pick === "correct", "up")} onClick={() => setPick(p.id, "correct")}>✓</button>
                      <button className={seg(row?.pick === "incorrect", "down")} onClick={() => setPick(p.id, "incorrect")}>✗</button>
                    </div>
                  </>
                )
              ) : (
                <div className="flex gap-1">
                  <button className={seg(row?.pick === "correct", "up")} onClick={() => setPick(p.id, "correct")}>✓</button>
                  <button className={seg(row?.pick === "incorrect", "down")} onClick={() => setPick(p.id, "incorrect")}>✗</button>
                  <button className={seg(row?.pick === "pass", "muted")} onClick={() => setPick(p.id, "pass")}>Pass</button>
                </div>
              )}

              <div className="w-20 text-right text-sm font-bold">
                {amount !== null && !st.locked ? (
                  <span className={amount > 0 ? "text-up" : amount < 0 ? "text-down" : "text-ink3"}>
                    {fmtMoney(amount)}
                  </span>
                ) : (
                  <span className="text-ink3">—</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <button
        onClick={submitAll}
        disabled={busy || pending.length === 0}
        className="w-full rounded-xl bg-gold py-3 text-lg font-black text-board transition-opacity disabled:opacity-40"
      >
        {busy
          ? "Saving…"
          : pending.length === 0
            ? "Set at least one result"
            : `Submit ${pending.length} score${pending.length === 1 ? "" : "s"}`}
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
