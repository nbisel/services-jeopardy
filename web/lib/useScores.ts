"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import type { Entry, Player, Score } from "./types";

const PAGE = 1000;

async function fetchAll<T>(table: string, columns: string, order: string): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from(table)
      .select(columns)
      .order(order, { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    rows.push(...((data ?? []) as T[]));
    if (!data || data.length < PAGE) return rows;
  }
}

export function useScores() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([
        fetchAll<Player>("players", "id, name", "name"),
        fetchAll<Score>(
          "scores",
          "id, player_id, date, result, amount, wager, edit_count",
          "date"
        ),
      ]);
      setPlayers(p);
      setScores(s);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
    const channel = supabase
      .channel("live-scores")
      .on("postgres_changes", { event: "*", schema: "public", table: "scores" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "players" }, refetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const entries: Entry[] = useMemo(() => {
    const names = new Map(players.map((p) => [p.id, p.name]));
    return scores.map((s) => ({ ...s, player: names.get(s.player_id) ?? "?" }));
  }, [players, scores]);

  return { players, scores, entries, loading, error, refetch };
}
