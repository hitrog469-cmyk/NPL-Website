import type { Delivery, Extras, Innings, PlayerId, TeamId, Wicket } from "./types";
import { isDismissal, isLegal, totalRuns } from "./rules";
import { scoreInnings, type InningsScorecard } from "./innings";

/**
 * Live scoring. The server stores an append-only log of events; everything
 * on screen is rebuilt from that log with the same engine used for history.
 */

/** Optional wagon-wheel tag: angle in degrees clockwise from straight down the ground (0 = straight), distance 0–1 of boundary. */
export interface ShotTag {
  angle: number;
  distance: number;
}

export interface LiveBall {
  batter: PlayerId;
  nonStriker: PlayerId;
  bowler: PlayerId;
  runsBat: number;
  extras: Extras;
  isBoundary: boolean;
  wickets: Wicket[];
  /** Who comes in for a dismissed batter; null if the innings ends. */
  newBatter?: PlayerId | null;
}

export type LiveEvent =
  | { id: string; innings: number; seq: number; kind: "delivery"; payload: LiveBall }
  | { id: string; innings: number; seq: number; kind: "void"; payload: { target: string } }
  | { id: string; innings: number; seq: number; kind: "tag"; payload: { target: string; shot: ShotTag } }
  | { id: string; innings: number; seq: number; kind: "ends"; payload: { striker: PlayerId; nonStriker: PlayerId } };

export interface LiveSetup {
  battingFirst: TeamId;
  bowlingFirst: TeamId;
  oversLimit: number;
  /** Revised second-innings target, if any. */
  revisedTarget?: { runs: number; overs: number } | null;
}

/** Runs the batters physically ran, which decides whether they crossed. */
export function runsCrossed(b: Pick<LiveBall, "runsBat" | "extras" | "isBoundary">): number {
  if (b.isBoundary) return 0;
  return b.runsBat + b.extras.byes + b.extras.legbyes + Math.max(0, b.extras.wides - 1);
}

/**
 * Who is on strike after a ball. Odd runs crossed swap ends; a caught batter's
 * replacement takes strike (MCC Law 18.11, 2022); end of over swaps ends.
 * Run outs keep the replacement at the dismissed batter's end after crossing.
 * The scorer can always correct with an explicit "ends" event.
 */
export function endsAfter(b: LiveBall, overComplete: boolean): { striker: PlayerId | null; nonStriker: PlayerId | null } {
  let striker: PlayerId | null = b.batter;
  let nonStriker: PlayerId | null = b.nonStriker;
  const caught = b.wickets.some((w) => w.kind === "caught" || w.kind === "caught and bowled");
  if (!caught && runsCrossed(b) % 2 === 1) [striker, nonStriker] = [nonStriker, striker];
  for (const w of b.wickets) {
    const incoming = b.newBatter ?? null;
    if (caught) {
      // Replacement takes strike; the not-out batter stays at the non-striker's end.
      striker = incoming;
      nonStriker = w.playerOut === b.batter ? b.nonStriker : b.batter;
    } else if (striker === w.playerOut) striker = incoming;
    else if (nonStriker === w.playerOut) nonStriker = incoming;
  }
  if (overComplete) [striker, nonStriker] = [nonStriker, striker];
  return { striker, nonStriker };
}

export interface LiveInningsState {
  innings: Innings;
  card: InningsScorecard;
  striker: PlayerId | null;
  nonStriker: PlayerId | null;
  /** Bowler of the current over, or null between overs. */
  bowler: PlayerId | null;
  lastBowler: PlayerId | null;
  legalInOver: number;
  /** Deliveries of the current (or just finished) over, in order. */
  thisOver: Delivery[];
  partnership: { runs: number; balls: number };
  shots: { delivery: Delivery; shot: ShotTag; eventId: string }[];
  /** Live delivery events still in force, newest last, with their ids. */
  deliveries: { eventId: string; delivery: Delivery }[];
  complete: boolean;
}

/** Rebuild one innings from its events. Voided deliveries are dropped; tags attach to their delivery. */
export function replayInnings(events: LiveEvent[], inningsNo: number, setup: LiveSetup, target: number | null): LiveInningsState {
  const evs = events.filter((e) => e.innings === inningsNo).sort((a, b) => a.seq - b.seq);
  const voided = new Set(evs.filter((e) => e.kind === "void").map((e) => (e.payload as { target: string }).target));
  const tags = new Map<string, ShotTag>();
  for (const e of evs) if (e.kind === "tag") tags.set(e.payload.target, e.payload.shot);

  const battingTeam = inningsNo % 2 === 1 ? setup.battingFirst : setup.bowlingFirst;
  const bowlingTeam = battingTeam === setup.battingFirst ? setup.bowlingFirst : setup.battingFirst;
  const oversLimit = inningsNo === 2 && setup.revisedTarget ? setup.revisedTarget.overs : inningsNo > 2 ? 1 : setup.oversLimit;

  const deliveries: { eventId: string; delivery: Delivery }[] = [];
  let striker: PlayerId | null = null;
  let nonStriker: PlayerId | null = null;
  let legal = 0;
  let lastBowler: PlayerId | null = null;
  let currentBowler: PlayerId | null = null;
  let runs = 0;
  let wickets = 0;
  let pRuns = 0;
  let pBalls = 0;

  for (const e of evs) {
    if (e.kind === "ends") {
      striker = e.payload.striker;
      nonStriker = e.payload.nonStriker;
      continue;
    }
    if (e.kind !== "delivery" || voided.has(e.id)) continue;
    const b = e.payload;
    const d: Delivery = {
      seq: deliveries.length,
      over: Math.floor(legal / 6),
      batter: b.batter,
      nonStriker: b.nonStriker,
      bowler: b.bowler,
      runsBat: b.runsBat,
      extras: b.extras,
      isBoundary: b.isBoundary,
      wickets: b.wickets,
    };
    deliveries.push({ eventId: e.id, delivery: d });
    if (isLegal(d)) legal++;
    runs += totalRuns(d);
    pRuns += totalRuns(d);
    if (isLegal(d)) pBalls++;
    const overComplete = isLegal(d) && legal % 6 === 0;
    currentBowler = overComplete ? null : b.bowler;
    if (overComplete) lastBowler = b.bowler;
    const ends = endsAfter(b, overComplete);
    striker = ends.striker;
    nonStriker = ends.nonStriker;
    if (d.wickets.some((w) => isDismissal(w.kind))) {
      wickets += d.wickets.filter((w) => isDismissal(w.kind)).length;
      pRuns = 0;
      pBalls = 0;
    }
  }

  const innings: Innings = {
    battingTeam,
    bowlingTeam,
    isSuperOver: inningsNo > 2,
    oversLimit,
    target: target !== null ? { runs: target, overs: oversLimit } : null,
    deliveries: deliveries.map((x) => x.delivery),
  };
  const card = scoreInnings(innings);
  const overIdx = legal === 0 ? 0 : legal % 6 === 0 ? legal / 6 - 1 : Math.floor(legal / 6);
  const thisOver = innings.deliveries.filter((d) => d.over === overIdx);
  const shots = deliveries.flatMap((x) => {
    const s = tags.get(x.eventId);
    return s ? [{ delivery: x.delivery, shot: s, eventId: x.eventId }] : [];
  });
  const complete = wickets >= 10 || legal >= oversLimit * 6 || (target !== null && runs >= target);

  return {
    innings,
    card,
    striker,
    nonStriker,
    bowler: currentBowler,
    lastBowler,
    legalInOver: legal % 6 === 0 && legal > 0 && currentBowler === null ? 6 : legal % 6,
    thisOver,
    partnership: { runs: pRuns, balls: pBalls },
    shots,
    deliveries,
    complete,
  };
}

/** Compact ball token for over strips: "•", "4", "W", "1wd", "nb4", "2lb". */
export function ballToken(d: Delivery): string {
  const out = d.wickets.some((w) => isDismissal(w.kind));
  const x = d.extras;
  let t: string;
  if (x.wides) t = `${x.wides > 1 ? x.wides - 1 : ""}wd`;
  else if (x.noballs) t = `nb${d.runsBat || x.byes || x.legbyes ? d.runsBat + x.byes + x.legbyes : ""}`;
  else if (x.byes) t = `${x.byes}b`;
  else if (x.legbyes) t = `${x.legbyes}lb`;
  else t = d.runsBat === 0 ? "•" : String(d.runsBat);
  if (out) t = t === "•" ? "W" : `W${t}`;
  return t;
}

/** Overs bowled per bowler, for the 4-over cap and the no-consecutive-overs rule. */
export function bowlerOvers(card: InningsScorecard): Map<PlayerId, number> {
  return new Map(card.bowlers.map((b) => [b.player, b.legalBalls / 6]));
}
