/**
 * Parses every imported match, folds it through cricket-core and checks the
 * scorecard invariants plus agreement with Cricsheet's own per-delivery totals.
 * Exits non-zero on any failure.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { reconcile, scoreInnings } from "@npl/cricket-core";
import { dataDir, loadDataset, type CricsheetMatch } from "@npl/data";

const ds = loadDataset();
let failures = 0;

for (const m of ds.matches) {
  const raw = JSON.parse(readFileSync(path.join(dataDir(), "cricsheet", "npl", `${m.id}.json`), "utf8")) as CricsheetMatch;
  m.innings.forEach((inn, i) => {
    const card = scoreInnings(inn);
    const errs = reconcile(card);
    // Independent check: Cricsheet's runs.total summed straight from the source file.
    const srcTotal = raw.innings[i]!.overs.flatMap((o) => o.deliveries).reduce((s, d) => s + d.runs.total, 0);
    if (srcTotal !== card.runs) errs.push(`source total ${srcTotal} != engine total ${card.runs}`);
    for (const e of errs) {
      failures++;
      console.error(`FAIL ${m.id} innings ${i + 1}: ${e}`);
    }
  });
}

const seasons = Object.entries(ds.matches.reduce<Record<string, number>>((a, m) => ((a[m.seasonId] = (a[m.seasonId] ?? 0) + 1), a), {}));
console.log(`Matches: ${ds.matches.length} (${seasons.map(([s, n]) => `${s}: ${n}`).join(", ")}), players: ${ds.players.size}`);
console.log(`Date range: ${ds.matches[0]?.date} – ${ds.matches.at(-1)?.date}`);
if (ds.warnings.length) console.log(`Parser warnings (${ds.warnings.length}):\n  ` + ds.warnings.join("\n  "));
console.log(failures ? `${failures} reconciliation failure(s)` : "All innings reconcile.");
process.exit(failures ? 1 : 0);
