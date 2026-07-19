import { NextResponse } from "next/server";
import { assignDailyClue } from "@/lib/assignClue";
import { SOLO_CLUE_VALUE, soloDateStr } from "@/lib/soloRules";

export const dynamic = "force-dynamic";

/**
 * Daily Solo Trivia assignment, hit by Vercel Cron (see vercel.json), same
 * pattern as /api/keepalive. Reads only from the already-reviewed pool — never
 * calls OpenTDB. Safe to run more than once a day and safe to run on an empty
 * pool (both are no-ops). "Today" is computed in Central so the clue lands on
 * the date players see.
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
  }

  const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
  const rest = (path: string, init?: RequestInit) =>
    fetch(`${url}/rest/v1/${path}`, { ...init, headers: { ...headers, ...(init?.headers ?? {}) }, cache: "no-store" });

  try {
    const result = await assignDailyClue({
      today: soloDateStr(),
      value: SOLO_CLUE_VALUE,

      clueDayExists: async (date) => {
        const res = await rest(`clue_days?date=eq.${date}&select=id&limit=1`);
        if (!res.ok) throw new Error(`clue_days lookup: ${res.status}`);
        const rows = (await res.json()) as unknown[];
        return rows.length > 0;
      },

      listApprovedClueIds: async () => {
        const res = await rest(`clue_pool?status=eq.approved&select=id`);
        if (!res.ok) throw new Error(`clue_pool lookup: ${res.status}`);
        const rows = (await res.json()) as { id: string }[];
        return rows.map((r) => r.id);
      },

      insertClueDay: async (date, cluePoolId, value) => {
        const res = await rest(`clue_days`, {
          method: "POST",
          body: JSON.stringify({ date, clue_pool_id: cluePoolId, value }),
        });
        if (res.ok) return "inserted";
        // 409 / 23505 => another run already inserted today's row.
        const body = await res.text();
        if (res.status === 409 || body.includes("23505")) return "duplicate";
        throw new Error(`clue_days insert: ${res.status} ${body}`);
      },

      markClueAssigned: async (cluePoolId) => {
        const res = await rest(`clue_pool?id=eq.${cluePoolId}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "assigned" }),
        });
        if (!res.ok) throw new Error(`clue_pool update: ${res.status}`);
      },
    });

    return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : "assignment failed" },
      { status: 500 }
    );
  }
}
