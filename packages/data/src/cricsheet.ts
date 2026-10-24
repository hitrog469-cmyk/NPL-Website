import type { Delivery, Innings, Match, MatchOutcome, MatchStage, Player, Provenance, TeamId, WicketKind } from "@npl/cricket-core";

/** Bump when parse output changes so imports can record which parser produced them. */
export const PARSER_VERSION = "1.0.0";

/** Subset of the Cricsheet JSON format we read (https://cricsheet.org/format/json/). */
export interface CricsheetMatch {
  meta: { data_version: string; created: string; revision: number };
  info: {
    balls_per_over: number;
    dates: string[];
    event?: { name: string; match_number?: number; stage?: string };
    outcome: {
      winner?: string;
      by?: { runs?: number; wickets?: number; innings?: number };
      method?: string;
      result?: string;
      eliminator?: string;
    };
    overs: number;
    player_of_match?: string[];
    players: Record<string, string[]>;
    registry: { people: Record<string, string> };
    season: string;
    teams: [string, string];
    toss?: { winner: string; decision: "bat" | "field" };
    venue: string;
  };
  innings: {
    team: string;
    super_over?: boolean;
    target?: { overs: number; runs: number };
    overs: {
      over: number;
      deliveries: {
        batter: string;
        bowler: string;
        non_striker: string;
        runs: { batter: number; extras: number; total: number; non_boundary?: boolean };
        extras?: { wides?: number; noballs?: number; byes?: number; legbyes?: number; penalty?: number };
        wickets?: { kind: string; player_out: string; fielders?: { name?: string }[] }[];
      }[];
    }[];
  }[];
}

export interface ParseContext {
  teamIdByAlias: Map<string, TeamId>;
  seasonIdByCricsheet: Map<string, string>;
}

export interface ParsedMatch {
  match: Match;
  players: Player[];
  warnings: string[];
}

const STAGES: Record<string, MatchStage> = {
  "Qualifier 1": "qualifier-1",
  Eliminator: "eliminator",
  "Qualifier 2": "qualifier-2",
  Final: "final",
};

export function parseCricsheet(id: string, raw: CricsheetMatch, checksum: string | null, ctx: ParseContext): ParsedMatch {
  const warnings: string[] = [];
  const { info } = raw;
  const people = info.registry.people;

  const team = (name: string): TeamId => {
    const t = ctx.teamIdByAlias.get(name);
    if (!t) throw new Error(`[${id}] unknown team name "${name}" — add it as an alias in data/teams.json`);
    return t;
  };
  // Players are identified by Cricsheet registry id, never by display name.
  const pid = (name: string): string => {
    const r = people[name];
    if (!r) throw new Error(`[${id}] no registry id for "${name}"`);
    return r;
  };

  const seasonId = ctx.seasonIdByCricsheet.get(info.season);
  if (!seasonId) throw new Error(`[${id}] unknown season "${info.season}" — add it to data/seasons.json`);
  if (info.balls_per_over !== 6) warnings.push(`balls_per_over is ${info.balls_per_over}`);

  const teams: [TeamId, TeamId] = [team(info.teams[0]), team(info.teams[1])];
  const other = (t: TeamId) => (t === teams[0] ? teams[1] : teams[0]);

  const innings: Innings[] = raw.innings.map((inn, idx) => {
    const battingTeam = team(inn.team);
    const isSuperOver = inn.super_over === true;
    let seq = 0;
    const deliveries: Delivery[] = [];
    for (const over of inn.overs) {
      for (const d of over.deliveries) {
        const x = d.extras ?? {};
        deliveries.push({
          seq: seq++,
          over: over.over,
          batter: pid(d.batter),
          nonStriker: pid(d.non_striker),
          bowler: pid(d.bowler),
          runsBat: d.runs.batter,
          extras: { wides: x.wides ?? 0, noballs: x.noballs ?? 0, byes: x.byes ?? 0, legbyes: x.legbyes ?? 0, penalty: x.penalty ?? 0 },
          isBoundary: (d.runs.batter === 4 || d.runs.batter === 6) && !d.runs.non_boundary,
          wickets: (d.wickets ?? []).map((w) => ({
            kind: w.kind as WicketKind,
            playerOut: pid(w.player_out),
            fielders: (w.fielders ?? []).flatMap((f) => (f.name && people[f.name] ? [people[f.name]!] : [])),
          })),
        });
        const extrasSum = (x.wides ?? 0) + (x.noballs ?? 0) + (x.byes ?? 0) + (x.legbyes ?? 0) + (x.penalty ?? 0);
        if (extrasSum !== d.runs.extras) warnings.push(`innings ${idx + 1} over ${over.over}: extras breakdown ${extrasSum} != runs.extras ${d.runs.extras}`);
        if (d.runs.batter + d.runs.extras !== d.runs.total) warnings.push(`innings ${idx + 1} over ${over.over}: runs do not sum to total`);
      }
    }
    const oversLimit = isSuperOver ? 1 : (inn.target?.overs ?? info.overs);
    if (!isSuperOver && inn.target && inn.target.overs !== info.overs) warnings.push(`innings ${idx + 1}: revised target ${inn.target.runs} in ${inn.target.overs} overs`);
    return { battingTeam, bowlingTeam: other(battingTeam), isSuperOver, oversLimit, target: inn.target ?? null, deliveries };
  });

  const o = info.outcome;
  let outcome: MatchOutcome;
  if (o.winner) outcome = { type: "win", winner: team(o.winner), by: { runs: o.by?.runs, wickets: o.by?.wickets }, method: o.method ?? null };
  else if (o.result === "tie") outcome = { type: "tie", superOverWinner: o.eliminator ? team(o.eliminator) : null };
  else if (o.result === "no result") outcome = { type: "no-result" };
  else outcome = { type: "requires-review", note: `unrecognised outcome ${JSON.stringify(o)}` };

  const stageName = info.event?.stage;
  const stage: MatchStage = stageName ? (STAGES[stageName] ?? "league") : "league";
  if (stageName && !STAGES[stageName]) warnings.push(`unknown stage "${stageName}"`);

  const provenance: Provenance = {
    kind: "historical_imported",
    sourceId: `cricsheet:${id}`,
    sourceRevision: raw.meta.revision,
    checksum,
    recordedAt: raw.meta.created,
    verifiedAt: null,
  };

  const squads: Record<TeamId, string[]> = {};
  for (const [name, list] of Object.entries(info.players)) squads[team(name)] = list.map(pid);

  // Squads plus anyone who appears on a delivery (replacement players are not in squads).
  const nameById = new Map(Object.entries(people).map(([n, r]) => [r, n]));
  const ids = new Set<string>(Object.values(squads).flat());
  for (const inn of innings)
    for (const d of inn.deliveries) {
      ids.add(d.batter).add(d.nonStriker).add(d.bowler);
      for (const w of d.wickets) w.fielders.forEach((f) => ids.add(f));
    }
  const players: Player[] = [...ids].map((r) => ({ id: r, name: nameById.get(r)!, cricsheetId: r }));

  const match: Match = {
    id,
    seasonId,
    stage,
    matchNumber: info.event?.match_number ?? null,
    date: info.dates[0]!,
    venue: info.venue,
    teams,
    toss: info.toss ? { winner: team(info.toss.winner), decision: info.toss.decision } : null,
    outcome,
    playerOfMatch: (info.player_of_match ?? []).map(pid),
    squads,
    innings,
    provenance,
  };
  return { match, players, warnings };
}
