# Services Jeopardy

Daily calendar Jeopardy score tracker for the team — Next.js + Supabase, with live-updating scores.

**Live app:** https://services-jeopardy.vercel.app

## How it works

Each workday has a dollar value (Mon $200, Tue $600, Wed $1,000, Thu $400, Fri $1,200, Sat $2,000). Answer the tear-off calendar question right and you win the value; wrong and you lose it; pass and you get $0. **Sunday is Wager Day**: bet up to the absolute value of your Mon–Sat total. One edit allowed per player per day — enforced by a Postgres trigger, so no take-backs after that.

## Pages

- **Today** — log your own score (three big buttons) or host-mode a whole group at once
- **Leaderboard** — weekly ✅/❌ grid, monthly podium, annual YTD pivot
- **Records** — 🔥 streaks, hall of fame, head-to-head comparisons
- **Charts** — monthly score race, correct-rate by weekday, Sunday risk profiles

Scores appear live for everyone via Supabase Realtime — no refresh button.

## Stack

- [Next.js](https://nextjs.org) (App Router) + Tailwind CSS, deployed on Vercel (free tier)
- [Supabase](https://supabase.com) free-tier Postgres + Realtime; no auth (office trust model), edit-limit rule enforced in the database
- Daily Vercel cron hits `/api/keepalive` so the free-tier database never pauses

## Development

```bash
cd web
npm install
npm run dev
```

Requires `.env.local` with `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

One-time import of historical scores from the old Google Sheet CSV:

```bash
node scripts/import-csv.mjs path/to/export.csv
```

The original Streamlit version lives in `app.py` at the repo root, kept as an archive.
