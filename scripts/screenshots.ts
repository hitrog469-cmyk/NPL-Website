/**
 * Full-page screenshots of key routes at the three review widths.
 *
 *   npm run screenshots -- [baseUrl] [outDir]
 *
 * Defaults to http://localhost:3010 and docs/screenshots/m1. Motion is
 * reduced so captures never land mid-animation; fonts are awaited.
 */
import { mkdirSync } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const base = process.argv[2] ?? "http://localhost:3010";
const out = process.argv[3] ?? "docs/screenshots/m1";
const WIDTHS = [375, 768, 1440];
const ROUTES = [
  { name: "home", path: "/" },
  { name: "records", path: "/records" },
  { name: "table", path: "/table" },
  { name: "table-s1", path: "/table/s1" },
  { name: "matches", path: "/matches" },
  { name: "match-superover", path: "/matches/1462658" },
];

async function main() {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch();
  const problems: string[] = [];
  for (const w of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, reducedMotion: "reduce", deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => problems.push(`${w}px ${page.url()}: ${e.message}`));
    for (const r of ROUTES) {
      const res = await page.goto(base + r.path, { waitUntil: "networkidle" });
      if (!res?.ok()) problems.push(`${w}px ${r.path}: HTTP ${res?.status()}`);
      await page.evaluate(() => document.fonts.ready);
      // Horizontal page scroll is a layout bug; scroll inside .table-wrap is allowed.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) problems.push(`${w}px ${r.path}: page overflows horizontally by ${overflow}px`);
      const file = path.join(out, `${r.name}-${w}.png`);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`saved ${file}`);
    }
    await ctx.close();
  }
  await browser.close();
  if (problems.length) {
    console.error("Problems:\n  " + problems.join("\n  "));
    process.exit(1);
  }
  console.log("No horizontal overflow, no page errors, all routes 200.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
