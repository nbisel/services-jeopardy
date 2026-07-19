"use client";

import { fmtMoney } from "@/lib/rules";

export type ResultPick = "correct" | "incorrect" | "pass";

/**
 * The per-cell result control shared by Host Mode and Catch-Up:
 * ✓ / ✗ / Pass on weekdays, wager input + ✓ / ✗ on Sundays.
 */
export default function ResultControl({
  sunday,
  cap,
  pick,
  wager,
  onPick,
  onWager,
}: {
  sunday: boolean;
  cap: number;
  pick: ResultPick | null;
  wager: number;
  onPick: (pick: ResultPick) => void;
  onWager: (wager: number) => void;
}) {
  const seg = (selected: boolean, tone: "up" | "down" | "muted") => {
    const tones = {
      up: selected ? "bg-up text-board" : "text-up hover:bg-up/10",
      down: selected ? "bg-down text-board" : "text-down hover:bg-down/10",
      muted: selected ? "bg-ink3 text-board" : "text-ink2 hover:bg-ink3/10",
    };
    return `rounded-md px-3 py-1.5 text-sm font-bold transition-colors ${tones[tone]}`;
  };

  if (sunday) {
    if (cap === 0) {
      return <span className="text-xs text-ink3">no weekly total — can’t wager</span>;
    }
    return (
      <>
        <input
          type="number"
          min={0}
          max={cap}
          placeholder="0"
          value={wager || ""}
          onChange={(e) => onWager(Math.max(0, Math.min(cap, Number(e.target.value) || 0)))}
          className="w-24 rounded-md border border-line bg-card2 px-2 py-1.5 text-sm"
        />
        <span className="text-xs text-ink3">max {fmtMoney(cap)}</span>
        <div className="flex gap-1">
          <button className={seg(pick === "correct", "up")} onClick={() => onPick("correct")}>✓</button>
          <button className={seg(pick === "incorrect", "down")} onClick={() => onPick("incorrect")}>✗</button>
        </div>
      </>
    );
  }

  return (
    <div className="flex gap-1">
      <button className={seg(pick === "correct", "up")} onClick={() => onPick("correct")}>✓</button>
      <button className={seg(pick === "incorrect", "down")} onClick={() => onPick("incorrect")}>✗</button>
      <button className={seg(pick === "pass", "muted")} onClick={() => onPick("pass")}>Pass</button>
    </div>
  );
}
