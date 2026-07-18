"use client";

import { useState } from "react";
import { addPlayer } from "@/lib/api";
import type { Player } from "@/lib/types";
import { MAX_NAME_LENGTH } from "@/lib/rules";

export default function PlayerPicker({
  players,
  value,
  onChange,
  onPlayerAdded,
}: {
  players: Player[];
  value: string | null;
  onChange: (id: string) => void;
  onPlayerAdded: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleAdd() {
    setBusy(true);
    setError(null);
    const res = await addPlayer(name);
    setBusy(false);
    if (res.ok) {
      onPlayerAdded();
      onChange(res.player.id);
      setAdding(false);
      setName("");
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="space-y-2">
      {adding ? (
        <div className="flex gap-2">
          <input
            autoFocus
            value={name}
            maxLength={MAX_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && name.trim() && handleAdd()}
            placeholder="New player name"
            className="w-full rounded-md border border-line bg-card2 px-3 py-2 text-sm"
          />
          <button
            onClick={handleAdd}
            disabled={busy || !name.trim()}
            className="rounded-md bg-gold px-3 py-2 text-sm font-bold text-board disabled:opacity-50"
          >
            Add
          </button>
          <button
            onClick={() => {
              setAdding(false);
              setError(null);
            }}
            className="rounded-md border border-line px-3 py-2 text-sm text-ink2"
          >
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <select
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-md border border-line bg-card2 px-3 py-2 text-sm"
          >
            <option value="" disabled>
              Who are you?
            </option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => setAdding(true)}
            className="shrink-0 rounded-md border border-line px-3 py-2 text-sm font-semibold text-ink2 hover:bg-card2"
          >
            + New
          </button>
        </div>
      )}
      {error && <p className="text-sm text-down">{error}</p>}
    </div>
  );
}
