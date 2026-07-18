import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Hit daily by Vercel Cron (see vercel.json) so the Supabase free-tier
// project never pauses from inactivity.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return NextResponse.json({ ok: false, error: "Missing Supabase env vars" }, { status: 500 });
  }
  const res = await fetch(`${url}/rest/v1/players?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  return NextResponse.json({ ok: res.ok, status: res.status, at: new Date().toISOString() });
}
