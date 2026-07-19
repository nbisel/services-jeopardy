#!/usr/bin/env node
/**
 * One-time import of the old Google Sheet data into Supabase.
 *
 * Usage:  node scripts/import-csv.mjs path/to/export.csv
 *
 * Expects the sheet's columns: User, Date, Day, Result, Amount.
 * Dedupes keep-last per (User, Date) — same rule the Streamlit app used —
 * and normalizes Result strings to the new enum.
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from
 * .env.local (or the environment).
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(root, ".env.local"))) {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const csvPath = process.argv[2];

if (!csvPath) {
  console.error("Usage: node scripts/import-csv.mjs path/to/export.csv");
  process.exit(1);
}
if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else if (c === '"') inQuotes = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f !== "")) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f !== "")) rows.push(row);
  return rows;
}

function normalizeResult(raw) {
  const r = String(raw).toLowerCase();
  const wager = r.includes("wager");
  if (r.includes("incorrect")) return wager ? "incorrect_wager" : "incorrect";
  if (r.includes("correct")) return wager ? "correct_wager" : "correct";
  if (r.includes("pass")) return "pass";
  return null;
}

function normalizeDate(raw) {
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); // M/D/YYYY (Sheets default)
  if (m) return `${m[3]}-${m[1].padStart(2, "0")}-${m[2].padStart(2, "0")}`;
  const d = new Date(s);
  if (!isNaN(d)) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return null;
}

async function rest(path, options = {}) {
  const res = await fetch(`${URL_BASE}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: KEY,
      Authorization: `Bearer ${KEY}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

const rows = parseCsv(readFileSync(csvPath, "utf8"));
const header = rows[0].map((h) => h.trim().toLowerCase());
const col = (name) => header.indexOf(name);
for (const required of ["user", "date", "result", "amount"]) {
  if (col(required) === -1) {
    console.error(`CSV is missing a "${required}" column. Found: ${header.join(", ")}`);
    process.exit(1);
  }
}

// Dedupe keep-last per (user, date)
const latest = new Map();
let skipped = 0;
for (const row of rows.slice(1)) {
  const user = String(row[col("user")] ?? "").trim();
  const date = normalizeDate(row[col("date")]);
  const result = normalizeResult(row[col("result")]);
  const amount = Math.round(Number(row[col("amount")]));
  if (!user || !date || !result || Number.isNaN(amount)) { skipped++; continue; }
  latest.set(`${user}|${date}`, { user, date, result, amount });
}
console.log(`Parsed ${rows.length - 1} rows → ${latest.size} unique (user, date) entries, ${skipped} skipped.`);

// Upsert players
const names = [...new Set([...latest.values()].map((e) => e.user))];
await rest("players?on_conflict=name", {
  method: "POST",
  headers: { Prefer: "resolution=ignore-duplicates" },
  body: JSON.stringify(names.map((name) => ({ name }))),
});
const players = await rest("players?select=id,name");
const idByName = new Map(players.map((p) => [p.name, p.id]));
console.log(`Players in database: ${players.length}`);

// Insert scores (ignore duplicates so the script is safe to re-run)
const scores = [...latest.values()].map((e) => ({
  player_id: idByName.get(e.user),
  date: e.date,
  result: e.result,
  amount: e.amount,
  wager: e.result.endsWith("_wager") ? Math.abs(e.amount) : null,
}));
const BATCH = 500;
for (let i = 0; i < scores.length; i += BATCH) {
  await rest("scores?on_conflict=player_id,date", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify(scores.slice(i, i + BATCH)),
  });
  console.log(`Inserted ${Math.min(i + BATCH, scores.length)}/${scores.length} scores…`);
}
console.log("Done.");
