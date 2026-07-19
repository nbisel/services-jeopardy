"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "./supabase";
import type { ClueDay, Entry, Player } from "./types";

const PAGE = 1000;

async function fetchAll<T>(
  table: string,
  columns: string,
  order: string
): Promise<T[]> {
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

type RawClueScore = {
  id: string;
  player_id: string;
  clue_day_id: string;
  date: string;
  result: "correct" | "incorrect" | "pass";
  amount: number;
  edit_count: number;
};

type RawClueDay = {
  id: string;
  date: string;
  value: number;
  clue_pool: {
    category: string | null;
    clue_text: string;
    correct_answer: string;
  } | null;
};

/**
 * Solo Trivia data hook — mirrors useScores(): paginated fetch + a Realtime
 * subscription, then maps clue_scores rows into the shared `Entry` shape so
 * lib/stats.ts functions work on them unmodified.
 */
export function useClueScores() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [clueScores, setClueScores] = useState<RawClueScore[]>([]);
  const [rawDays, setRawDays] = useState<RawClueDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    try {
      const [p, s, d] = await Promise.all([
        fetchAll<Player>("players", "id, name, active", "name"),
        fetchAll<RawClueScore>(
          "clue_scores",
          "id, player_id, clue_day_id, date, result, amount, edit_count",
          "date"
        ),
        fetchAll<RawClueDay>(
          "clue_days",
          "id, date, value, clue_pool:clue_pool_id(category, clue_text, correct_answer)",
          "date"
        ),
      ]);
      setPlayers(p);
      setClueScores(s);
      setRawDays(d);
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
      .channel("live-clue-scores")
      .on("postgres_changes", { event: "*", schema: "public", table: "clue_scores" }, refetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "clue_days" }, refetch)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetch]);

  const entries: Entry[] = useMemo(() => {
    const names = new Map(players.map((p) => [p.id, p.name]));
    return clueScores.map((s) => ({
      id: s.id,
      player_id: s.player_id,
      date: s.date,
      result: s.result,
      amount: s.amount,
      wager: null,
      edit_count: s.edit_count,
      player: names.get(s.player_id) ?? "?",
    }));
  }, [players, clueScores]);

  const clueDays: ClueDay[] = useMemo(
    () =>
      rawDays.map((d) => ({
        id: d.id,
        date: d.date,
        value: d.value,
        category: d.clue_pool?.category ?? null,
        clue_text: d.clue_pool?.clue_text ?? "",
        correct_answer: d.clue_pool?.correct_answer ?? "",
      })),
    [rawDays]
  );

  return { players, entries, clueDays, loading, error, refetch };
}
