#!/usr/bin/env node
/**
 * Bulk-import EASY-only trivia questions from the Open Trivia Database into the
 * clue_pool table as `pending` (awaiting review on the Manage Clues page).
 *
 * Usage:  node scripts/import-trivia.mjs
 *
 * - Makes at most ONE api.php call per run (OpenTDB rate limit: 1 req / 5s / IP),
 *   so run it occasionally (weekly, or when the approved pool runs low), never
 *   on a request path.
 * - difficulty=easy is mandatory and never widened, even on a short pull.
 * - Dedupes by a normalized SHA-256 hash of the question text (OpenTDB has no
 *   stable question id).
 *
 * Reads NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY from
 * .env.local (or the environment), same as scripts/import-csv.mjs.
 */
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createHash } from "node:crypto";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
if (existsSync(join(root, ".env.local"))) {
  for (const line of readFileSync(join(root, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
}

const URL_BASE = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_BASE || !KEY) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}

// amount=50 is OpenTDB's per-call maximum; easy-only, multiple-choice source
// (we keep only correct_answer), base64 to sidestep HTML-entity encoding.
const OPENTDB_URL =
  "https://opentdb.com/api.php?amount=50&type=multiple&difficulty=easy&encode=base64";

const b64 = (s) => Buffer.from(s, "base64").toString("utf8");
const normalize = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();
const hash = (s) => createHash("sha256").update(normalize(s)).digest("hex");

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

async function main() {
  console.log("Fetching up to 50 easy questions from OpenTDB…");
  const res = await fetch(OPENTDB_URL);
  if (!res.ok) throw new Error(`OpenTDB request failed: ${res.status}`);
  const json = await res.json();

  // response_code 1 = "No Results" (fewer easy questions than asked). Not an
  // error — just import whatever came back (possibly nothing) and stop. Never
  // retry with a wider difficulty.
  if (json.response_code !== 0 && json.response_code !== 1) {
    throw new Error(`OpenTDB response_code ${json.response_code}`);
  }
  const results = json.results ?? [];
  console.log(`OpenTDB returned ${results.length} question(s).`);

  // Decode and enforce easy-only defensively.
  const decoded = results
    .map((r) => ({
      category: b64(r.category),
      clue_text: b64(r.question),
      correct_answer: b64(r.correct_answer),
      difficulty: b64(r.difficulty),
    }))
    .filter((r) => r.difficulty === "easy");

  // Dedupe within this pull, then against what's already stored.
  const byHash = new Map();
  for (const r of decoded) byHash.set(hash(r.clue_text), r);
  const hashes = [...byHash.keys()];

  let existing = new Set();
  if (hashes.length > 0) {
    const inList = `(${hashes.map((h) => `"${h}"`).join(",")})`;
    const rows = await rest(`clue_pool?select=text_hash&text_hash=in.${inList}`);
    existing = new Set((rows ?? []).map((r) => r.text_hash));
  }

  const toInsert = [];
  for (const [h, r] of byHash) {
    if (existing.has(h)) continue;
    toInsert.push({
      category: r.category,
      clue_text: r.clue_text,
      correct_answer: r.correct_answer,
      difficulty: "easy",
      source: "opentdb",
      status: "pending",
      text_hash: h,
    });
  }

  if (toInsert.length > 0) {
    await rest("clue_pool?on_conflict=text_hash", {
      method: "POST",
      headers: { Prefer: "resolution=ignore-duplicates" },
      body: JSON.stringify(toInsert),
    });
  }

  const skipped = decoded.length - toInsert.length;
  console.log(
    `Fetched ${results.length}, inserted ${toInsert.length} new, skipped ${skipped} duplicate(s).`
  );
  console.log("All new rows are 'pending' — review them on the Manage Clues page.");
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
