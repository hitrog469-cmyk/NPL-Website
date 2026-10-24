import type { MatchOutcome, TeamId } from "./types";

/**
 * Points-table engine. The rules are configuration, not assumptions baked into
 * code: until the official NPL playing conditions are entered, the table is
 * labelled provisional.
 */
export interface StandingsRules {
  pointsWin: number;
  pointsTie: number;
  pointsNoResult: number;
  /** If true, a tied match decided by Super Over counts as a win/loss. */
  superOverDecidesTie: boolean;
  /** Where these rules came from; "assumed" until the official document is entered. */
  source: "assumed" | "official";
  sourceNote: string;
}

export const ASSUMED_T20_RULES: StandingsRules = {
  pointsWin: 2,
  pointsTie: 1,
  pointsNoResult: 1,
  superOverDecidesTie: true,
  source: "assumed",
  sourceNote: "Common T20 league rules (2 win, 1 tie/no result, Super Over decides ties). Not yet confirmed against NPL Season 3 playing conditions.",
};

/** The minimum a points table needs from one innings. Main innings only, no Super Over. */
export interface InningsTotal {
  team: TeamId;
  runs: number;
  /** For display only; NRR does not use it. */
  wickets?: number;
  legalBalls: number;
  allOut: boolean;
  /** Overs allotted to this innings, used as the NRR denominator when all out. */
  oversLimit: number;
}

export interface ResultSummary {
  matchId: string;
  teams: [TeamId, TeamId];
  outcome: MatchOutcome;
  innings: InningsTotal[];
}

export interface StandingRow {
  team: TeamId;
  played: number;
  won: number;
  lost: number;
  tied: number;
  noResult: number;
  points: number;
  runsFor: number;
  ballsFaced: number;
  runsAgainst: number;
  ballsBowled: number;
  nrr: number | null;
  /** Matches excluded from NRR (e.g. revised targets awaiting review). */
  nrrExcluded: string[];
}

export function computeStandings(teams: TeamId[], results: ResultSummary[], rules: StandingsRules): StandingRow[] {
  const rows = new Map<TeamId, StandingRow>(
    teams.map((t) => [t, { team: t, played: 0, won: 0, lost: 0, tied: 0, noResult: 0, points: 0, runsFor: 0, ballsFaced: 0, runsAgainst: 0, ballsBowled: 0, nrr: null, nrrExcluded: [] }]),
  );
  const row = (t: TeamId) => {
    const r = rows.get(t);
    if (!r) throw new Error(`Result references unknown team "${t}"`);
    return r;
  };

  for (const res of results) {
    const [a, b] = res.teams;
    const ra = row(a);
    const rb = row(b);
    const o = res.outcome;
    if (o.type === "requires-review") continue;
    ra.played++;
    rb.played++;

    if (o.type === "no-result" || o.type === "abandoned") {
      ra.noResult++;
      rb.noResult++;
      ra.points += rules.pointsNoResult;
      rb.points += rules.pointsNoResult;
      continue; // No NRR contribution.
    }

    if (o.type === "win") {
      const [w, l] = o.winner === a ? [ra, rb] : [rb, ra];
      w.won++;
      l.lost++;
      w.points += rules.pointsWin;
    } else if (o.type === "tie") {
      if (rules.superOverDecidesTie && o.superOverWinner) {
        const [w, l] = o.superOverWinner === a ? [ra, rb] : [rb, ra];
        w.won++;
        l.lost++;
        w.points += rules.pointsWin;
      } else {
        ra.tied++;
        rb.tied++;
        ra.points += rules.pointsTie;
        rb.points += rules.pointsTie;
      }
    }

    // NRR: all-out innings count as the full allotted overs.
    if (res.innings.length !== 2) {
      ra.nrrExcluded.push(res.matchId);
      rb.nrrExcluded.push(res.matchId);
      continue;
    }
    for (const inn of res.innings) {
      const balls = inn.allOut ? inn.oversLimit * 6 : inn.legalBalls;
      const batting = row(inn.team);
      const bowling = inn.team === a ? rb : ra;
      batting.runsFor += inn.runs;
      batting.ballsFaced += balls;
      bowling.runsAgainst += inn.runs;
      bowling.ballsBowled += balls;
    }
  }

  for (const r of rows.values()) {
    r.nrr = r.ballsFaced > 0 && r.ballsBowled > 0 ? (r.runsFor * 6) / r.ballsFaced - (r.runsAgainst * 6) / r.ballsBowled : null;
  }

  return [...rows.values()].sort(
    (x, y) => y.points - x.points || (y.nrr ?? 0) - (x.nrr ?? 0) || y.won - x.won || x.team.localeCompare(y.team),
  );
}
