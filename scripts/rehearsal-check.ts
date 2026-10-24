/**
 * End-to-end check of live scoring on the REHEARSAL fixture only.
 *
 *   npx tsx scripts/rehearsal-check.ts [baseUrl]
 *
 * Uses SUPABASE_SECRET_KEY from apps/web/.env.local to act as the scorer,
 * opens /live/rehearsal in a headless browser, inserts balls one at a time
 * and checks the page shows each new score without a reload. Cleans up after.
 */
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

const env = Object.fromEntries(
  readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const base = process.argv[2] ?? "http://localhost:3011";
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL!, env.SUPABASE_SECRET_KEY!, { auth: { persistSession: false } });
const F = "rehearsal";
const Z = { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalty: 0 };

async function reset() {
  await db.from("ball_events").delete().eq("fixture_id", F);
  await db.from("live_matches").update({ status: "scheduled", setup: {}, result: null }).eq("fixture_id", F);
}

async function main() {
  await reset();
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${base}/live/${F}`, { waitUntil: "networkidle" });

  const score = () => page.locator(".lv-inn.on .lv-runs").first().textContent({ timeout: 8000 });
  const waitFor = async (text: string) => {
    const t0 = Date.now();
    await page.locator(".lv-inn.on .lv-runs", { hasText: text }).first().waitFor({ timeout: 8000 });
    return Date.now() - t0;
  };

  const { error } = await db.from("live_matches").update({
    status: "live",
    setup: { battingFirst: "lumbini-lions", bowlingFirst: "sudurpaschim-royals", oversLimit: 20, currentInnings: 1, toss: { winner: "lumbini-lions", decision: "bat" } },
  }).eq("fixture_id", F);
  if (error) throw error;
  await db.from("ball_events").insert({ fixture_id: F, innings: 1, seq: 0, kind: "ends", payload: { striker: "Rohit Paudel", nonStriker: "Sundeep Jora" } });
  console.log(`setup visible after ${await waitFor("0/0")} ms`);

  const balls = [
    { runsBat: 4, isBoundary: true, expect: "4/0" },
    { runsBat: 1, isBoundary: false, expect: "5/0" },
    { runsBat: 6, isBoundary: true, expect: "11/0" },
  ];
  let seq = 1;
  for (const b of balls) {
    await db.from("ball_events").insert({
      fixture_id: F, innings: 1, seq: seq++, kind: "delivery",
      payload: { batter: "Rohit Paudel", nonStriker: "Sundeep Jora", bowler: "Hemant Dhami", runsBat: b.runsBat, extras: Z, isBoundary: b.isBoundary, wickets: [] },
    });
    console.log(`ball → ${b.expect} shown after ${await waitFor(b.expect)} ms (no reload)`);
  }
  const { data: last } = await db.from("ball_events").select("id").eq("fixture_id", F).eq("seq", 3).single();
  await db.from("ball_events").insert({ fixture_id: F, innings: 1, seq: seq++, kind: "void", payload: { target: last!.id } });
  console.log(`undo → 5/0 shown after ${await waitFor("5/0")} ms`);
  console.log(`final on page: ${await score()}`);

  await browser.close();
  await reset();
  console.log("Rehearsal wiped. Live loop works end to end.");
}

main().catch(async (e) => {
  console.error(e);
  await reset().catch(() => {});
  process.exit(1);
});
