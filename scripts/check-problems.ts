/** Groups reconciliation failures in one Cricsheet archive by kind. Diagnostic only. */
import { strFromU8, unzipSync } from "fflate";
import { reconcile, scoreInnings } from "@npl/cricket-core";
import { parseCricsheet, type CricsheetMatch } from "@npl/data";

async function main() {
  const archive = process.argv[2] ?? "t20s_male_json";
  const z = unzipSync(new Uint8Array(await (await fetch(`https://cricsheet.org/downloads/${archive}.zip`)).arrayBuffer()));
  const kinds: Record<string, string[]> = {};
  for (const [f, b] of Object.entries(z)) {
    if (!f.endsWith(".json")) continue;
    const raw = JSON.parse(strFromU8(b)) as CricsheetMatch;
    if (raw.info.balls_per_over !== 6) continue;
    const p = parseCricsheet(f.replace(".json", ""), raw, null, { teamIdByAlias: new Map(), seasonIdByCricsheet: new Map(), open: true });
    for (const inn of p.match.innings)
      for (const e of reconcile(scoreInnings(inn))) (kinds[e.replace(/\d+(\.\d+)?/g, "N")] ??= []).push(`${p.match.id}: ${e}`);
  }
  for (const [k, v] of Object.entries(kinds)) console.log(`${v.length}× ${k}\n   ${v.slice(0, 3).join("\n   ")}`);
}

main();
