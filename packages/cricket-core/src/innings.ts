import type { Extras, Innings, PlayerId, WicketKind } from "./types";
import { bowlerRuns, isBallFaced, isBowlerWicket, isDismissal, isLegal, totalRuns } from "./rules";

export type BatterStatus = "not out" | "out" | "retired hurt" | "did not bat";

export interface BatterLine {
  player: PlayerId;
  position: number;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  dots: number;
  status: BatterStatus;
  dismissal: { kind: WicketKind; bowler: PlayerId | null; fielders: PlayerId[] } | null;
}

export interface BowlerLine {
  player: PlayerId;
  legalBalls: number;
  runs: number;
  wickets: number;
  maidens: number;
  dots: number;
  wides: number;
  noballs: number;
  fours: number;
  sixes: number;
}

export interface FallOfWicket {
  wicketNumber: number;
  player: PlayerId;
  score: number;
  /** Legal balls bowled when the wicket fell (incl. this ball if legal). */
  legalBalls: number;
  seq: number;
}

export interface OverSummary {
  over: number;
  runs: number;
  wickets: number;
  legalBalls: number;
  bowlers: PlayerId[];
}

export interface InningsScorecard {
  battingTeam: string;
  bowlingTeam: string;
  isSuperOver: boolean;
  runs: number;
  wickets: number;
  legalBalls: number;
  oversLimit: number;
  extras: Extras & { total: number };
  allOut: boolean;
  batters: BatterLine[];
  bowlers: BowlerLine[];
  fallOfWickets: FallOfWicket[];
  overs: OverSummary[];
}

/**
 * Fold an innings' deliveries into a scorecard. Pure and deterministic:
 * same events in, same card out. The card is a cache; the events are truth.
 */
export function scoreInnings(innings: Innings): InningsScorecard {
  const batters = new Map<PlayerId, BatterLine>();
  const bowlers = new Map<PlayerId, BowlerLine>();
  const overs = new Map<number, OverSummary & { bowlerRuns: number }>();
  const extras = { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalty: 0, total: 0 };
  const fallOfWickets: FallOfWicket[] = [];
  let runs = 0;
  let wickets = 0;
  let legalBalls = 0;

  const batter = (id: PlayerId) => {
    let b = batters.get(id);
    if (!b) {
      b = { player: id, position: batters.size + 1, runs: 0, balls: 0, fours: 0, sixes: 0, dots: 0, status: "not out", dismissal: null };
      batters.set(id, b);
    }
    // A retired-hurt batter who walks back out is not out again.
    if (b.status === "retired hurt") b.status = "not out";
    return b;
  };
  const bowler = (id: PlayerId) => {
    let b = bowlers.get(id);
    if (!b) {
      b = { player: id, legalBalls: 0, runs: 0, wickets: 0, maidens: 0, dots: 0, wides: 0, noballs: 0, fours: 0, sixes: 0 };
      bowlers.set(id, b);
    }
    return b;
  };

  const ordered = [...innings.deliveries].sort((a, b) => a.seq - b.seq);
  for (const d of ordered) {
    const striker = batter(d.batter);
    batter(d.nonStriker);
    const bw = bowler(d.bowler);
    const legal = isLegal(d);
    const total = totalRuns(d);
    const conceded = bowlerRuns(d);

    runs += total;
    if (legal) legalBalls++;
    extras.wides += d.extras.wides;
    extras.noballs += d.extras.noballs;
    extras.byes += d.extras.byes;
    extras.legbyes += d.extras.legbyes;
    extras.penalty += d.extras.penalty;

    striker.runs += d.runsBat;
    if (isBallFaced(d)) {
      striker.balls++;
      if (d.runsBat === 0) striker.dots++;
    }
    if (d.isBoundary && d.runsBat === 4) striker.fours++;
    if (d.isBoundary && d.runsBat === 6) striker.sixes++;

    bw.runs += conceded;
    bw.wides += d.extras.wides > 0 ? 1 : 0;
    bw.noballs += d.extras.noballs > 0 ? 1 : 0;
    if (legal) {
      bw.legalBalls++;
      if (conceded === 0) bw.dots++;
    }
    if (d.isBoundary && d.runsBat === 4) bw.fours++;
    if (d.isBoundary && d.runsBat === 6) bw.sixes++;

    let o = overs.get(d.over);
    if (!o) {
      o = { over: d.over, runs: 0, wickets: 0, legalBalls: 0, bowlers: [], bowlerRuns: 0 };
      overs.set(d.over, o);
    }
    o.runs += total;
    o.bowlerRuns += conceded;
    if (legal) o.legalBalls++;
    if (!o.bowlers.includes(d.bowler)) o.bowlers.push(d.bowler);

    for (const w of d.wickets) {
      const out = batter(w.playerOut);
      if (w.kind === "retired hurt" || w.kind === "retired not out") {
        out.status = "retired hurt";
        out.dismissal = { kind: w.kind, bowler: null, fielders: [] };
        continue;
      }
      out.status = "out";
      out.dismissal = { kind: w.kind, bowler: isBowlerWicket(w.kind) ? d.bowler : null, fielders: w.fielders };
      if (isBowlerWicket(w.kind)) bw.wickets++;
      if (isDismissal(w.kind)) {
        wickets++;
        o.wickets++;
        fallOfWickets.push({ wicketNumber: wickets, player: w.playerOut, score: runs, legalBalls, seq: d.seq });
      }
    }
  }

  // Maiden: a complete over by a single bowler with no runs charged to the bowler.
  for (const o of overs.values()) {
    const only = o.bowlers.length === 1 ? o.bowlers[0] : undefined;
    if (only && o.legalBalls === 6 && o.bowlerRuns === 0) bowler(only).maidens++;
  }

  extras.total = extras.wides + extras.noballs + extras.byes + extras.legbyes + extras.penalty;

  return {
    battingTeam: innings.battingTeam,
    bowlingTeam: innings.bowlingTeam,
    isSuperOver: innings.isSuperOver,
    runs,
    wickets,
    legalBalls,
    oversLimit: innings.oversLimit,
    extras,
    allOut: wickets >= 10,
    batters: [...batters.values()],
    bowlers: [...bowlers.values()],
    fallOfWickets,
    overs: [...overs.values()].sort((a, b) => a.over - b.over).map(({ bowlerRuns: _, ...o }) => o),
  };
}

/** Invariants that must hold for every card we publish. Returns human-readable failures. */
export function reconcile(card: InningsScorecard): string[] {
  const errors: string[] = [];
  const batRuns = card.batters.reduce((s, b) => s + b.runs, 0);
  if (batRuns + card.extras.total !== card.runs) errors.push(`batter runs ${batRuns} + extras ${card.extras.total} != total ${card.runs}`);
  const bowlRuns = card.bowlers.reduce((s, b) => s + b.runs, 0);
  const nonBowler = card.extras.byes + card.extras.legbyes + card.extras.penalty;
  if (bowlRuns + nonBowler !== card.runs) errors.push(`bowler runs ${bowlRuns} + byes/lb/pen ${nonBowler} != total ${card.runs}`);
  const bowlBalls = card.bowlers.reduce((s, b) => s + b.legalBalls, 0);
  if (bowlBalls !== card.legalBalls) errors.push(`bowler balls ${bowlBalls} != legal balls ${card.legalBalls}`);
  if (card.oversLimit > 0 && card.legalBalls > card.oversLimit * 6) errors.push(`legal balls ${card.legalBalls} exceed ${card.oversLimit} overs`);
  if (card.wickets > 10) errors.push(`wickets ${card.wickets} > 10`);
  const outs = card.batters.filter((b) => b.status === "out").length;
  if (outs !== card.wickets) errors.push(`dismissed batters ${outs} != wickets ${card.wickets}`);
  const overRuns = card.overs.reduce((s, o) => s + o.runs, 0);
  if (overRuns !== card.runs) errors.push(`over-by-over runs ${overRuns} != total ${card.runs}`);
  return errors;
}
