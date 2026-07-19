"use client";

import { useState } from "react";
import { renamePlayer, setPlayerActive } from "@/lib/api";
import type { Player } from "@/lib/types";
import { MAX_NAME_LENGTH } from "@/lib/rules";

export default function ManagePlayers({
  players,
  onChanged,
}: {
  players: Player[];
  onChanged: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveRename(id: string) {
    setBusyId(id);
    setError(null);
    const res = await renamePlayer(id, draft);
    setBusyId(null);
    if (res.ok) {
      setEditingId(null);
      onChanged();
    } else {
      setError(res.error);
    }
  }

  async function toggleActive(p: Player) {
    setBusyId(p.id);
    setError(null);
    const res = await setPlayerActive(p.id, !p.active);
    setBusyId(null);
    if (res.ok) onChanged();
    else setError(res.error);
  }

  if (players.length === 0) {
    return <p className="text-sm text-ink2">No players yet.</p>;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-ink3">
        Archived players disappear from the entry pickers, but all their history stays on the
        Leaderboard, Records, and Charts.
      </p>
      <div className="divide-y divide-line rounded-xl border border-line">
        {players.map((p) => (
          <div key={p.id} className="flex flex-wrap items-center gap-2 px-3 py-2.5">
            {editingId === p.id ? (
              <>
                <input
                  autoFocus
                  value={draft}
                  maxLength={MAX_NAME_LENGTH}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && draft.trim() && saveRename(p.id)}
                  className="min-w-0 flex-1 rounded-md border border-line bg-card2 px-3 py-1.5 text-sm"
                />
                <button
                  onClick={() => saveRename(p.id)}
                  disabled={busyId === p.id || !draft.trim()}
                  className="rounded-md bg-gold px-3 py-1.5 text-sm font-bold text-board disabled:opacity-50"
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setEditingId(null);
                    setError(null);
                  }}
                  className="rounded-md border border-line px-3 py-1.5 text-sm text-ink2"
                >
                  Cancel
                </button>
              </>
            ) : (
              <>
                <div className="min-w-28 flex-1">
                  <span className={`font-semibold ${p.active ? "" : "text-ink3 line-through"}`}>
                    {p.name}
                  </span>
                  {!p.active && (
                    <span className="ml-2 text-xs uppercase tracking-wide text-ink3">
                      archived
                    </span>
                  )}
                </div>
                <button
                  onClick={() => {
                    setEditingId(p.id);
                    setDraft(p.name);
                    setError(null);
                  }}
                  className="rounded-md border border-line px-3 py-1.5 text-sm text-ink2 hover:bg-card2"
                >
                  Rename
                </button>
                <button
                  onClick={() => toggleActive(p)}
                  disabled={busyId === p.id}
                  className={`rounded-md border px-3 py-1.5 text-sm disabled:opacity-50 ${
                    p.active
                      ? "border-down/50 text-down hover:bg-down/10"
                      : "border-up/50 text-up hover:bg-up/10"
                  }`}
                >
                  {p.active ? "Archive" : "Restore"}
                </button>
              </>
            )}
          </div>
        ))}
      </div>
      {error && <p className="text-sm text-down">{error}</p>}
    </div>
  );
}
