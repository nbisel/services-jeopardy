"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { approveClue, skipClue } from "@/lib/clueApi";
import type { CluePoolRow } from "@/lib/types";
import LoadingSpinner from "@/components/LoadingSpinner";

export default function ManageCluesPage() {
  const [pending, setPending] = useState<CluePoolRow[]>([]);
  const [approvedCount, setApprovedCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [{ data: rows, error: e1 }, { count }] = await Promise.all([
        supabase
          .from("clue_pool")
          .select("*")
          .eq("status", "pending")
          .order("created_at", { ascending: true }),
        supabase
          .from("clue_pool")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved"),
      ]);
      if (e1) throw new Error(e1.message);
      setPending((rows ?? []) as CluePoolRow[]);
      setApprovedCount(count ?? 0);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load clues");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function act(id: string, action: "approve" | "skip") {
    setBusyId(id);
    const res = action === "approve" ? await approveClue(id) : await skipClue(id);
    setBusyId(null);
    if (res.ok) {
      setPending((p) => p.filter((c) => c.id !== id));
      if (action === "approve") setApprovedCount((n) => n + 1);
    } else {
      setError(res.error);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl tracking-wide text-gold">Manage Clues</h1>
        <Link
          href="/solo"
          className="shrink-0 rounded-md border border-line px-3 py-1.5 text-xs font-semibold text-ink2 hover:bg-card2"
        >
          ← Back to Solo Trivia
        </Link>
      </div>

      <div className="rounded-xl border border-line bg-card px-4 py-3 text-sm">
        <span className="font-bold text-gold">{approvedCount}</span> approved clue
        {approvedCount === 1 ? "" : "s"} queued for assignment.
        {approvedCount < 7 && (
          <span className="text-ink3">
            {" "}
            Running low — approve more below, or run{" "}
            <code className="rounded bg-card2 px-1">node scripts/import-trivia.mjs</code> to pull a
            fresh batch.
          </span>
        )}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading clues" />
      ) : error ? (
        <p className="text-center text-sm text-down">Couldn’t load data: {error}</p>
      ) : pending.length === 0 ? (
        <p className="rounded-xl border border-line bg-card p-5 text-center text-sm text-ink3">
          No clues awaiting review. Run the import script to pull more from OpenTDB.
        </p>
      ) : (
        <div className="space-y-3">
          <p className="text-xs text-ink3">
            {pending.length} clue{pending.length === 1 ? "" : "s"} awaiting review. Approve good
            ones; skip anything ambiguous, outdated, or regionally specific.
          </p>
          {pending.map((c) => (
            <div key={c.id} className="rounded-xl border border-line bg-card p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-gold">
                {c.category ?? "Trivia"}
              </div>
              <p className="mt-1 text-sm font-semibold text-ink">{c.clue_text}</p>
              <p className="mt-1 text-sm text-ink2">
                Answer: <span className="font-semibold text-ink">{c.correct_answer}</span>
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => act(c.id, "approve")}
                  disabled={busyId === c.id}
                  className="rounded-md border border-up/50 px-3 py-1.5 text-sm font-semibold text-up hover:bg-up/10 disabled:opacity-50"
                >
                  Approve
                </button>
                <button
                  onClick={() => act(c.id, "skip")}
                  disabled={busyId === c.id}
                  className="rounded-md border border-down/50 px-3 py-1.5 text-sm font-semibold text-down hover:bg-down/10 disabled:opacity-50"
                >
                  Skip
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
