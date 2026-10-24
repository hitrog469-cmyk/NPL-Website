import "server-only";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { dataDir } from "@npl/data";

/** Shapes written by scripts/derive-cricket.ts. */
export interface InningsLine { team: string; runs: number; wickets: number; overs: string; allOut: boolean }
export interface MatchSummary {
  id: string;
  date: string;
  season: string;
  venue: string;
  stage: string;
  teams: string[];
  innings: InningsLine[];
  winner: string | null;
  result: string;
}
export interface CompIndexEntry {
  id: string;
  name: string;
  short: string;
  format: "T20" | "ODI" | "Test";
  kind: "league" | "international";
  coverage: { matches: number; first: string | null; last: string | null };
  latest: MatchSummary | null;
}
export interface Competition extends Omit<CompIndexEntry, "latest"> {
  source: string;
  seasons: { season: string; matches: number; first: string; last: string; champion: string | null }[];
  teams: { team: string; played: number; won: number; lost: number; tied: number; drawn: number; noResult: number; last: string }[];
  recent: MatchSummary[];
  scorecards: string[];
  records: {
    mostRuns: { player: string; matches: number; innings: number; runs: number; highest: string; average: number | null; strikeRate: number | null; hundreds: number; fifties: number }[];
    mostWickets: { player: string; matches: number; overs: string; wickets: number; best: string; average: number | null; economy: number | null }[];
    highestScores: { player: string; runs: number; balls: number; notOut: boolean; match: string; date: string; team: string; opponent: string }[];
    bestFigures: { player: string; wickets: number; runs: number; overs: string; match: string; date: string; team: string; opponent: string }[];
    mostSixes: { player: string; innings: number; sixes: number; fours: number }[];
    bestStrikeRate: { player: string; balls: number; runs: number; strikeRate: number }[];
    highestTotals: { team: string; runs: number; wickets: number; overs: string; match: string; date: string; opponent: string }[];
    minBalls: number;
  };
  problems: number;
}
export interface Scorecard extends MatchSummary {
  toss: { winner: string; decision: string } | null;
  playerOfMatch: string[];
  scorecard: {
    team: string;
    superOver: boolean;
    runs: number;
    wickets: number;
    overs: string;
    extras: { wides: number; noballs: number; byes: number; legbyes: number; penalty: number; total: number };
    batters: { name: string; runs: number; balls: number; fours: number; sixes: number; out: string }[];
    bowlers: { name: string; overs: string; maidens: number; runs: number; wickets: number }[];
    fow: string[];
    perOver: number[];
  }[];
}

const root = () => path.join(dataDir(), "derived", "cricket");
const read = <T>(p: string): T | null => (existsSync(p) ? (JSON.parse(readFileSync(p, "utf8")) as T) : null);

export const cricketIndex = (): CompIndexEntry[] => read<CompIndexEntry[]>(path.join(root(), "index.json")) ?? [];
export const competition = (id: string) => read<Competition>(path.join(root(), `${id}.json`));
export const scorecard = (comp: string, match: string) =>
  /^[a-z0-9-]+$/.test(comp) && /^\d+$/.test(match) ? read<Scorecard>(path.join(root(), comp, `${match}.json`)) : null;

export const scoreText = (i: InningsLine) => `${i.runs}${i.allOut ? "" : `/${i.wickets}`}`;
