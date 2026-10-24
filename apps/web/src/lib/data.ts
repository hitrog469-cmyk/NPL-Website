import "server-only";
import {
  aggregate,
  ASSUMED_T20_RULES,
  average,
  betterFigures,
  computeStandings,
  economy,
  scoreInnings,
  strikeRate,
  type Aggregates,
  type InningsScorecard,
  type Match,
  type ResultSummary,
  type Team,
  type WicketKind,
} from "@npl/cricket-core";
import { loadDataset, loadS3Fixtures, loadS3Results, loadS3Squads, type Fixture } from "@npl/data";

export const ds = () => loadDataset();

const teamMap = () => new Map(ds().teams.map((t) => [t.id, t]));
export const team = (id: string): Team => teamMap().get(id) ?? { id, name: id, shortName: id.slice(0, 2).toUpperCase(), aliases: [], colour: null, spellingVerified: false };
export const playerName = (id: string) => ds().players.get(id)?.name ?? id;

export const historicalSeasons = () => ds().seasons.filter((s) => s.cricsheetSeason);
export const seasonLabel = (id: string) => ds().seasons.find((s) => s.id === id)?.label ?? id;
export const matchesIn = (seasonId?: string) => ds().matches.filter((m) => !seasonId || m.seasonId === seasonId);
export const matchById = (id: string) => ds().matches.find((m) => m.id === id);

export interface Coverage {
  matches: number;
  first: string | null;
  last: string | null;
}

export function coverage(seasonId?: string): Coverage {
  const ms = matchesIn(seasonId);
  return { matches: ms.length, first: ms[0]?.date ?? null, last: ms.at(-1)?.date ?? null };
}

export const STAGE_LABEL: Record<Match["stage"], string> = {
  league: "League",
  "qualifier-1": "Qualifier 1",
  eliminator: "Eliminator",
  "qualifier-2": "Qualifier 2",
  final: "Final",
};

export const matchLabel = (m: Match) => (m.stage === "league" ? `Match ${m.matchNumber ?? ""}`.trim() : STAGE_LABEL[m.stage]);

export interface ScoredMatch {
  match: Match;
  cards: InningsScorecard[];
  superOvers: InningsScorecard[];
}

export function scored(m: Match): ScoredMatch {
  const all = m.innings.map(scoreInnings);
  return { match: m, cards: all.filter((c) => !c.isSuperOver), superOvers: all.filter((c) => c.isSuperOver) };
}

/** Plain result line built from structured outcome. Rule-based, never free text. */
export function resultLine(m: Match): string {
  const o = m.outcome;
  switch (o.type) {
    case "win": {
      const margin = o.by.runs != null ? `${o.by.runs} run${o.by.runs === 1 ? "" : "s"}` : o.by.wickets != null ? `${o.by.wickets} wicket${o.by.wickets === 1 ? "" : "s"}` : "";
      return `${team(o.winner).name} won${margin ? " by " + margin : ""}${o.method ? ` (${o.method})` : ""}`;
    }
    case "tie":
      return o.superOverWinner ? `Match tied · ${team(o.superOverWinner).name} won the Super Over` : "Match tied";
    case "no-result":
      return "No result";
    case "abandoned":
      return "Abandoned";
    case "requires-review":
      return "Result requires review";
  }
}

export const winnerOf = (m: Match) => (m.outcome.type === "win" ? m.outcome.winner : m.outcome.type === "tie" ? m.outcome.superOverWinner : null);

export function dismissalText(d: { kind: WicketKind; bowler: string | null; fielders: string[] } | null, status: string): string {
  if (!d) return status === "not out" ? "not out" : "";
  const b = d.bowler ? playerName(d.bowler) : "";
  const f = d.fielders.map(playerName).join("/");
  switch (d.kind) {
    case "bowled": return `b ${b}`;
    case "caught": return `c ${f || "sub"} b ${b}`;
    case "caught and bowled": return `c & b ${b}`;
    case "lbw": return `lbw b ${b}`;
    case "stumped": return `st ${f} b ${b}`;
    case "hit wicket": return `hit wicket b ${b}`;
    case "run out": return f ? `run out (${f})` : "run out";
    default: return d.kind;
  }
}

/* ---------- records ---------- */

const aggCache = new Map<string, Aggregates>();
export function agg(seasonId?: string): Aggregates {
  const k = seasonId ?? "all";
  let a = aggCache.get(k);
  if (!a) {
    a = aggregate(matchesIn(seasonId));
    aggCache.set(k, a);
  }
  return a;
}

/** The team a player most recently appeared for in this set of matches. */
export function lastTeamOf(playerId: string, seasonId?: string): string | null {
  const ms = matchesIn(seasonId);
  for (let i = ms.length - 1; i >= 0; i--) {
    for (const [t, squad] of Object.entries(ms[i]!.squads)) if (squad.includes(playerId)) return t;
  }
  return null;
}

export const QUALIFIERS = {
  strikeRateMinBalls: 150,
  economyMinBalls: 180,
} as const;

export function records(seasonId?: string) {
  const a = agg(seasonId);
  const bat = a.batting.filter((b) => b.innings > 0);
  const bowl = a.bowling.filter((b) => b.legalBalls > 0);

  const mostRuns = [...bat].sort((x, y) => y.runs - x.runs || x.balls - y.balls).slice(0, 10)
    .map((b) => ({ ...b, avg: average(b.runs, b.innings - b.notOuts), sr: strikeRate(b.runs, b.balls) }));
  const mostWickets = [...bowl].sort((x, y) => y.wickets - x.wickets || x.runs - y.runs).slice(0, 10)
    .map((b) => ({ ...b, econ: economy(b.runs, b.legalBalls), avg: average(b.runs, b.wickets) }));
  const highestScores = [...a.battingInnings].sort((x, y) => y.runs - x.runs || x.balls - y.balls).slice(0, 10);
  const bestFigures = [...a.bowlingFigures].sort((x, y) => (betterFigures(x, y) ? -1 : betterFigures(y, x) ? 1 : 0)).slice(0, 10);
  const mostSixes = [...bat].sort((x, y) => y.sixes - x.sixes || y.fours - x.fours).slice(0, 10);
  const bestStrikeRate = bat.filter((b) => b.balls >= QUALIFIERS.strikeRateMinBalls)
    .map((b) => ({ ...b, sr: strikeRate(b.runs, b.balls)! }))
    .sort((x, y) => y.sr - x.sr).slice(0, 10);
  const bestEconomy = bowl.filter((b) => b.legalBalls >= QUALIFIERS.economyMinBalls)
    .map((b) => ({ ...b, econ: economy(b.runs, b.legalBalls)! }))
    .sort((x, y) => x.econ - y.econ).slice(0, 10);
  const highestTotals = [...a.teamInnings].sort((x, y) => y.runs - x.runs || x.legalBalls - y.legalBalls).slice(0, 10);
  const lowestTotals = a.teamInnings.filter((t) => t.completed).sort((x, y) => x.runs - y.runs || x.legalBalls - y.legalBalls).slice(0, 10);

  return { mostRuns, mostWickets, highestScores, bestFigures, mostSixes, bestStrikeRate, bestEconomy, highestTotals, lowestTotals };
}

/* ---------- tables ---------- */

export function summaryOf(m: Match): ResultSummary {
  const { cards } = scored(m);
  return {
    matchId: m.id,
    teams: m.teams,
    outcome: m.outcome,
    innings: cards.map((c) => ({ team: c.battingTeam, runs: c.runs, wickets: c.wickets, legalBalls: c.legalBalls, allOut: c.allOut, oversLimit: c.oversLimit })),
  };
}

export function historicalTable(seasonId: string) {
  const league = matchesIn(seasonId).filter((m) => m.stage === "league");
  const teams = [...new Set(league.flatMap((m) => m.teams))];
  return { rows: computeStandings(teams, league.map(summaryOf), ASSUMED_T20_RULES), rules: ASSUMED_T20_RULES, matches: league.length };
}

export function s3Table() {
  const teams = ds().teams.map((t) => t.id);
  const results = loadS3Results(teams);
  return { rows: computeStandings(teams, results, ASSUMED_T20_RULES), rules: ASSUMED_T20_RULES, results };
}

export const s3Fixtures = () => loadS3Fixtures();
export const s3Squads = () => loadS3Squads();

/** Upcoming fixtures from `now`, earliest first. A match stays "next" until 4 hours after the start. */
export function upcomingFixtures(now = new Date()) {
  const cutoff = now.getTime() - 4 * 3600_000;
  return s3Fixtures().fixtures.filter((f) => f.status !== "cancelled" && Date.parse(f.startsAtUtc) > cutoff);
}

export const fixtureLabel = (f: Fixture) => (f.stage === "league" ? `Match ${f.matchNumber}` : STAGE_LABEL[f.stage]);

export function teamFixtures(teamId: string) {
  return s3Fixtures().fixtures.filter((f) => f.teams?.includes(teamId));
}

/** Season-by-season results for a team from the ball-by-ball archive. */
export function teamHistory(teamId: string) {
  return historicalSeasons().map((s) => {
    const ms = matchesIn(s.id).filter((m) => m.teams.includes(teamId));
    const won = ms.filter((m) => winnerOf(m) === teamId).length;
    const nr = ms.filter((m) => m.outcome.type === "no-result" || m.outcome.type === "abandoned").length;
    const reached = ms.filter((m) => m.stage !== "league").map((m) => m.stage);
    const champion = ms.some((m) => m.stage === "final" && winnerOf(m) === teamId);
    return { season: s, played: ms.length, won, lost: ms.length - won - nr, noResult: nr, playoffs: reached, champion };
  });
}

/** Top run-scorers and wicket-takers for a team across the archive. */
export function teamLeaders(teamId: string) {
  const a = agg();
  const runs = new Map<string, number>();
  const wkts = new Map<string, number>();
  for (const b of a.battingInnings) if (b.ref.team === teamId) runs.set(b.player, (runs.get(b.player) ?? 0) + b.runs);
  for (const b of a.bowlingFigures) if (b.ref.team === teamId) wkts.set(b.player, (wkts.get(b.player) ?? 0) + b.wickets);
  const top = (m: Map<string, number>) => [...m].sort((x, y) => y[1] - x[1]).slice(0, 5).map(([player, value]) => ({ player, value }));
  return { runs: top(runs), wickets: top(wkts) };
}
export const s3Season = () => ds().seasons.find((s) => s.id === "s3")!;

export const finals = () => ds().matches.filter((m) => m.stage === "final");
