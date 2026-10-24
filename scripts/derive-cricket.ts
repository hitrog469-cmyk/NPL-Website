/**
 * Cricket everywhere: downloads Cricsheet archives for other competitions and
 * writes compact summaries the site can serve (records, teams, seasons,
 * recent results, recent scorecards). Raw files are never committed — they
 * are hundreds of MB; the summaries are a few MB.
 *
 *   npx tsx scripts/derive-cricket.ts            all competitions
 *   npx tsx scripts/derive-cricket.ts ipl t20i   just these
 *
 * Every number comes from the same cricket-core engine as NPL, and every
 * innings is checked with reconcile(); failures are reported, not hidden.
 */
import { mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { strFromU8, unzipSync } from "fflate";
import { aggregate, average, betterFigures, economy, oversDisplay, reconcile, scoreInnings, strikeRate, type Match } from "@npl/cricket-core";
import { dataDir, parseCricsheet, type CricsheetMatch } from "@npl/data";

interface Comp {
  id: string;
  name: string;
  short: string;
  format: "T20" | "ODI" | "Test";
  kind: "league" | "international";
  archive: string;
}

export const COMPETITIONS: Comp[] = [
  { id: "ipl", name: "Indian Premier League", short: "IPL", format: "T20", kind: "league", archive: "ipl_male_json" },
  { id: "t20i", name: "T20 Internationals", short: "T20I", format: "T20", kind: "international", archive: "t20s_male_json" },
  { id: "bbl", name: "Big Bash League", short: "BBL", format: "T20", kind: "league", archive: "bbl_male_json" },
  { id: "psl", name: "Pakistan Super League", short: "PSL", format: "T20", kind: "league", archive: "psl_male_json" },
  { id: "cpl", name: "Caribbean Premier League", short: "CPL", format: "T20", kind: "league", archive: "cpl_male_json" },
  { id: "sa20", name: "SA20", short: "SA20", format: "T20", kind: "league", archive: "sat_male_json" },
  { id: "ilt20", name: "International League T20", short: "ILT20", format: "T20", kind: "league", archive: "ilt_male_json" },
  { id: "odi", name: "One-Day Internationals", short: "ODI", format: "ODI", kind: "international", archive: "odis_male_json" },
  { id: "test", name: "Test cricket", short: "Tests", format: "Test", kind: "international", archive: "tests_male_json" },
];

const RECENT = 40;
const outRoot = path.join(dataDir(), "derived", "cricket");

async function derive(c: Comp) {
  const t0 = Date.now();
  const res = await fetch(`https://cricsheet.org/downloads/${c.archive}.zip`);
  if (!res.ok) throw new Error(`${c.id}: HTTP ${res.status}`);
  const files = unzipSync(new Uint8Array(await res.arrayBuffer()));

  const matches: Match[] = [];
  const names = new Map<string, string>();
  const teamNames = new Map<string, string>();
  const problems: string[] = [];
  for (const [file, bytes] of Object.entries(files)) {
    if (!/^\d+\.json$/.test(file)) continue;
    try {
      const raw = JSON.parse(strFromU8(bytes)) as CricsheetMatch;
      if (raw.info.balls_per_over !== 6) continue; // engine is six-ball only
      const p = parseCricsheet(file.replace(".json", ""), raw, null, { teamIdByAlias: new Map(), seasonIdByCricsheet: new Map(), open: true });
      for (const inn of p.match.innings) {
        const errs = reconcile(scoreInnings(inn));
        if (errs.length) problems.push(`${p.match.id}: ${errs[0]}`);
      }
      raw.info.teams.forEach((n, i) => teamNames.set(p.match.teams[i]!, n));
      for (const pl of p.players) names.set(pl.id, pl.name);
      matches.push(p.match);
    } catch (e) {
      problems.push(`${file}: ${e instanceof Error ? e.message : e}`);
    }
  }
  matches.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const nm = (id: string) => names.get(id) ?? id;
  const tn = (id: string) => teamNames.get(id) ?? id;
  const agg = aggregate(matches);
  const winner = (m: Match) => (m.outcome.type === "win" ? m.outcome.winner : m.outcome.type === "tie" ? m.outcome.superOverWinner : null);
  const resultText = (m: Match) => {
    const o = m.outcome;
    if (o.type === "win") return `${tn(o.winner)} won${o.by.runs != null ? ` by ${o.by.runs} run${o.by.runs === 1 ? "" : "s"}` : o.by.wickets != null ? ` by ${o.by.wickets} wicket${o.by.wickets === 1 ? "" : "s"}` : ""}${o.method ? ` (${o.method})` : ""}`;
    if (o.type === "tie") return o.superOverWinner ? `Tied · ${tn(o.superOverWinner)} won the Super Over` : "Match tied";
    if (o.type === "draw") return "Match drawn";
    if (o.type === "no-result") return "No result";
    return "Result not recorded";
  };
  const summary = (m: Match) => ({
    id: m.id,
    date: m.date,
    season: m.seasonId,
    venue: m.venue,
    stage: m.stage,
    teams: m.teams.map(tn),
    innings: m.innings.filter((i) => !i.isSuperOver).map((i) => {
      const s = scoreInnings(i);
      return { team: tn(i.battingTeam), runs: s.runs, wickets: s.wickets, overs: oversDisplay(s.legalBalls), allOut: s.allOut };
    }),
    winner: winner(m) ? tn(winner(m)!) : null,
    result: resultText(m),
  });

  // Seasons with match counts and, for leagues, the final's winner.
  const seasons = [...new Set(matches.map((m) => m.seasonId))].map((s) => {
    const ms = matches.filter((m) => m.seasonId === s);
    const final = ms.find((m) => m.stage === "final");
    return { season: s, matches: ms.length, first: ms[0]!.date, last: ms.at(-1)!.date, champion: final && winner(final) ? tn(winner(final)!) : null };
  }).reverse();

  // Team records across the archive.
  const teams = new Map<string, { team: string; played: number; won: number; lost: number; tied: number; drawn: number; noResult: number; last: string }>();
  for (const m of matches) {
    for (const t of m.teams) {
      const r = teams.get(t) ?? { team: tn(t), played: 0, won: 0, lost: 0, tied: 0, drawn: 0, noResult: 0, last: m.date };
      r.played++;
      r.last = m.date;
      const w = winner(m);
      if (m.outcome.type === "draw") r.drawn++;
      else if (m.outcome.type === "no-result" || m.outcome.type === "abandoned") r.noResult++;
      else if (m.outcome.type === "tie" && !w) r.tied++;
      else if (w === t) r.won++;
      else if (w) r.lost++;
      teams.set(t, r);
    }
  }

  const bat = agg.batting.filter((b) => b.innings > 0);
  const bowl = agg.bowling.filter((b) => b.legalBalls > 0);
  const minBalls = c.format === "Test" ? 1000 : c.format === "ODI" ? 500 : 250;
  const ref = (r: { matchId: string; date: string; team: string; opponent: string }) => ({ match: r.matchId, date: r.date, team: tn(r.team), opponent: tn(r.opponent) });
  const records = {
    mostRuns: [...bat].sort((a, b) => b.runs - a.runs).slice(0, 15).map((b) => ({
      player: nm(b.player), matches: b.matches, innings: b.innings, runs: b.runs, highest: b.highest ? `${b.highest.runs}${b.highest.notOut ? "*" : ""}` : "–",
      average: average(b.runs, b.innings - b.notOuts), strikeRate: strikeRate(b.runs, b.balls), hundreds: b.hundreds, fifties: b.fifties,
    })),
    mostWickets: [...bowl].sort((a, b) => b.wickets - a.wickets || a.runs - b.runs).slice(0, 15).map((b) => ({
      player: nm(b.player), matches: b.matches, overs: oversDisplay(b.legalBalls), wickets: b.wickets, best: b.best ? `${b.best.wickets}/${b.best.runs}` : "–",
      average: average(b.runs, b.wickets), economy: economy(b.runs, b.legalBalls),
    })),
    highestScores: [...agg.battingInnings].sort((a, b) => b.runs - a.runs || a.balls - b.balls).slice(0, 15).map((b) => ({ player: nm(b.player), runs: b.runs, balls: b.balls, notOut: b.notOut, ...ref(b.ref) })),
    bestFigures: [...agg.bowlingFigures].sort((a, b) => (betterFigures(a, b) ? -1 : betterFigures(b, a) ? 1 : 0)).slice(0, 15).map((f) => ({ player: nm(f.player), wickets: f.wickets, runs: f.runs, overs: oversDisplay(f.legalBalls), ...ref(f.ref) })),
    mostSixes: [...bat].sort((a, b) => b.sixes - a.sixes).slice(0, 15).map((b) => ({ player: nm(b.player), innings: b.innings, sixes: b.sixes, fours: b.fours })),
    bestStrikeRate: bat.filter((b) => b.balls >= minBalls).map((b) => ({ player: nm(b.player), balls: b.balls, runs: b.runs, strikeRate: strikeRate(b.runs, b.balls)! })).sort((a, b) => b.strikeRate - a.strikeRate).slice(0, 15),
    highestTotals: [...agg.teamInnings].sort((a, b) => b.runs - a.runs).slice(0, 15).map((t) => ({ team: tn(t.team), runs: t.runs, wickets: t.wickets, overs: oversDisplay(t.legalBalls), ...ref(t.ref) })),
    minBalls,
  };

  // Recent scorecards in full; older matches keep their summary only.
  const recent = matches.slice(-RECENT);
  const cardDir = path.join(outRoot, c.id);
  rmSync(cardDir, { recursive: true, force: true });
  mkdirSync(cardDir, { recursive: true });
  for (const m of recent) {
    const innings = m.innings.map((i) => {
      const s = scoreInnings(i);
      return {
        team: tn(i.battingTeam), superOver: i.isSuperOver, runs: s.runs, wickets: s.wickets, overs: oversDisplay(s.legalBalls), extras: s.extras,
        batters: s.batters.map((b) => ({ name: nm(b.player), runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, out: b.status === "out" ? `${b.dismissal?.kind ?? "out"}${b.dismissal?.bowler ? ` b ${nm(b.dismissal.bowler)}` : ""}` : b.status })),
        bowlers: s.bowlers.map((b) => ({ name: nm(b.player), overs: oversDisplay(b.legalBalls), maidens: b.maidens, runs: b.runs, wickets: b.wickets })),
        fow: s.fallOfWickets.map((f) => `${f.score}-${f.wicketNumber} (${nm(f.player)}, ${oversDisplay(f.legalBalls)})`),
        perOver: s.overs.map((o) => o.runs),
      };
    });
    writeFileSync(path.join(cardDir, `${m.id}.json`), JSON.stringify({ ...summary(m), toss: m.toss ? { winner: tn(m.toss.winner), decision: m.toss.decision } : null, playerOfMatch: m.playerOfMatch.map(nm), scorecard: innings }));
  }

  const out = {
    id: c.id, name: c.name, short: c.short, format: c.format, kind: c.kind,
    source: `https://cricsheet.org/downloads/${c.archive}.zip`,
    coverage: { matches: matches.length, first: matches[0]?.date ?? null, last: matches.at(-1)?.date ?? null },
    seasons,
    teams: [...teams.values()].sort((a, b) => b.played - a.played),
    recent: recent.map(summary).reverse(),
    scorecards: recent.map((m) => m.id),
    records,
    problems: problems.length,
  };
  writeFileSync(path.join(outRoot, `${c.id}.json`), JSON.stringify(out));
  console.log(`${c.short.padEnd(6)} ${String(matches.length).padStart(5)} matches  ${out.coverage.first} → ${out.coverage.last}  ${problems.length} problem(s)  ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  if (problems.length) console.log("   e.g. " + problems.slice(0, 3).join("\n        "));
  return out;
}

async function main() {
  mkdirSync(outRoot, { recursive: true });
  const want = process.argv.slice(2);
  const list = want.length ? COMPETITIONS.filter((c) => want.includes(c.id)) : COMPETITIONS;
  for (const c of list) await derive(c);
  // Index of everything on disk, so the site never needs to know the list.
  const index = readdirSync(outRoot)
    .filter((f) => f.endsWith(".json") && f !== "index.json")
    .map((f) => {
      const j = JSON.parse(readFileSync(path.join(outRoot, f), "utf8"));
      return { id: j.id, name: j.name, short: j.short, format: j.format, kind: j.kind, coverage: j.coverage, latest: j.recent[0] ?? null };
    })
    .sort((a, b) => COMPETITIONS.findIndex((c) => c.id === a.id) - COMPETITIONS.findIndex((c) => c.id === b.id));
  writeFileSync(path.join(outRoot, "index.json"), JSON.stringify(index, null, 1));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
