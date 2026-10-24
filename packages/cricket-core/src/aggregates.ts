import type { Match, PlayerId, TeamId } from "./types";
import { scoreInnings, type InningsScorecard } from "./innings";

/**
 * Career aggregates over a set of matches. Super Overs are excluded from all
 * player and team aggregates (they are reported separately), matching common
 * T20 statistical convention.
 */

export interface MatchRef {
  matchId: string;
  date: string;
  seasonId: string;
  team: TeamId;
  opponent: TeamId;
}

export interface BattingCareer {
  player: PlayerId;
  matches: number;
  innings: number;
  notOuts: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  fifties: number;
  hundreds: number;
  ducks: number;
  highest: { runs: number; notOut: boolean; ref: MatchRef } | null;
}

export interface BowlingCareer {
  player: PlayerId;
  matches: number;
  innings: number;
  legalBalls: number;
  runs: number;
  wickets: number;
  dots: number;
  maidens: number;
  fourWickets: number;
  fiveWickets: number;
  best: { wickets: number; runs: number; ref: MatchRef } | null;
}

export interface BattingInnings {
  player: PlayerId;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  notOut: boolean;
  ref: MatchRef;
}

export interface BowlingFigures {
  player: PlayerId;
  wickets: number;
  runs: number;
  legalBalls: number;
  ref: MatchRef;
}

export interface TeamInnings {
  team: TeamId;
  runs: number;
  wickets: number;
  legalBalls: number;
  allOut: boolean;
  /** All out, or batted the full allotted overs. Used for "lowest total". */
  completed: boolean;
  ref: MatchRef;
}

export interface Aggregates {
  matchCount: number;
  firstDate: string | null;
  lastDate: string | null;
  batting: BattingCareer[];
  bowling: BowlingCareer[];
  battingInnings: BattingInnings[];
  bowlingFigures: BowlingFigures[];
  teamInnings: TeamInnings[];
}

/** Better bowling figures: more wickets, then fewer runs. */
export const betterFigures = (a: { wickets: number; runs: number }, b: { wickets: number; runs: number }) =>
  a.wickets !== b.wickets ? a.wickets > b.wickets : a.runs < b.runs;

export function aggregate(matches: Match[]): Aggregates {
  const bat = new Map<PlayerId, BattingCareer & { matchIds: Set<string> }>();
  const bowl = new Map<PlayerId, BowlingCareer & { matchIds: Set<string> }>();
  const battingInnings: BattingInnings[] = [];
  const bowlingFigures: BowlingFigures[] = [];
  const teamInnings: TeamInnings[] = [];
  const dates = matches.map((m) => m.date).sort();

  for (const m of matches) {
    // Squad membership defines a match played, even without batting or bowling.
    for (const [, squad] of Object.entries(m.squads)) {
      for (const p of squad) {
        battingEntry(bat, p).matchIds.add(m.id);
      }
    }
    for (const inn of m.innings) {
      if (inn.isSuperOver) continue;
      const card: InningsScorecard = scoreInnings(inn);
      const ref: MatchRef = { matchId: m.id, date: m.date, seasonId: m.seasonId, team: inn.battingTeam, opponent: inn.bowlingTeam };
      const bowlRef: MatchRef = { ...ref, team: inn.bowlingTeam, opponent: inn.battingTeam };

      teamInnings.push({
        team: inn.battingTeam,
        runs: card.runs,
        wickets: card.wickets,
        legalBalls: card.legalBalls,
        allOut: card.allOut,
        completed: card.allOut || card.legalBalls === card.oversLimit * 6,
        ref,
      });

      for (const b of card.batters) {
        const c = battingEntry(bat, b.player);
        c.matchIds.add(m.id);
        c.innings++;
        const notOut = b.status !== "out";
        if (notOut) c.notOuts++;
        c.runs += b.runs;
        c.balls += b.balls;
        c.fours += b.fours;
        c.sixes += b.sixes;
        if (b.runs >= 100) c.hundreds++;
        else if (b.runs >= 50) c.fifties++;
        if (b.runs === 0 && b.status === "out") c.ducks++;
        if (!c.highest || b.runs > c.highest.runs || (b.runs === c.highest.runs && notOut && !c.highest.notOut)) {
          c.highest = { runs: b.runs, notOut, ref };
        }
        battingInnings.push({ player: b.player, runs: b.runs, balls: b.balls, fours: b.fours, sixes: b.sixes, notOut, ref });
      }

      for (const b of card.bowlers) {
        let c = bowl.get(b.player);
        if (!c) {
          c = { player: b.player, matches: 0, innings: 0, legalBalls: 0, runs: 0, wickets: 0, dots: 0, maidens: 0, fourWickets: 0, fiveWickets: 0, best: null, matchIds: new Set() };
          bowl.set(b.player, c);
        }
        c.matchIds.add(m.id);
        c.innings++;
        c.legalBalls += b.legalBalls;
        c.runs += b.runs;
        c.wickets += b.wickets;
        c.dots += b.dots;
        c.maidens += b.maidens;
        if (b.wickets >= 5) c.fiveWickets++;
        else if (b.wickets >= 4) c.fourWickets++;
        if (!c.best || betterFigures(b, c.best)) c.best = { wickets: b.wickets, runs: b.runs, ref: bowlRef };
        bowlingFigures.push({ player: b.player, wickets: b.wickets, runs: b.runs, legalBalls: b.legalBalls, ref: bowlRef });
      }
    }
  }

  const finish = <T extends { matchIds: Set<string>; matches: number }>(x: T) => {
    const { matchIds, ...rest } = x;
    return { ...rest, matches: matchIds.size };
  };

  return {
    matchCount: matches.length,
    firstDate: dates[0] ?? null,
    lastDate: dates[dates.length - 1] ?? null,
    batting: [...bat.values()].map(finish),
    bowling: [...bowl.values()].map(finish),
    battingInnings,
    bowlingFigures,
    teamInnings,
  };
}

function battingEntry(map: Map<PlayerId, BattingCareer & { matchIds: Set<string> }>, p: PlayerId) {
  let c = map.get(p);
  if (!c) {
    c = { player: p, matches: 0, innings: 0, notOuts: 0, runs: 0, balls: 0, fours: 0, sixes: 0, fifties: 0, hundreds: 0, ducks: 0, highest: null, matchIds: new Set() };
    map.set(p, c);
  }
  return c;
}
