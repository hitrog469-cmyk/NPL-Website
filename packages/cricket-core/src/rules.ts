import type { Delivery, WicketKind } from "./types";

/** Wicket kinds credited to the bowler. */
const BOWLER_WICKETS: ReadonlySet<WicketKind> = new Set<WicketKind>([
  "bowled",
  "caught",
  "caught and bowled",
  "lbw",
  "stumped",
  "hit wicket",
]);

/** Kinds that leave the batter not out (they may come back). */
const NOT_OUT_RETIREMENTS: ReadonlySet<WicketKind> = new Set<WicketKind>(["retired hurt", "retired not out"]);

export const isBowlerWicket = (k: WicketKind) => BOWLER_WICKETS.has(k);

/** Counts against the team's wickets and the batter's dismissals. */
export const isDismissal = (k: WicketKind) => !NOT_OUT_RETIREMENTS.has(k);

/** A legal ball counts toward the over: not a wide, not a no-ball. */
export const isLegal = (d: Delivery) => d.extras.wides === 0 && d.extras.noballs === 0;

/** Ball faced by the striker: everything except a wide. */
export const isBallFaced = (d: Delivery) => d.extras.wides === 0;

export const totalRuns = (d: Delivery) =>
  d.runsBat + d.extras.wides + d.extras.noballs + d.extras.byes + d.extras.legbyes + d.extras.penalty;

/** Runs charged to the bowler: bat runs plus wides and no-balls. Byes, leg-byes and penalties are not. */
export const bowlerRuns = (d: Delivery) => d.runsBat + d.extras.wides + d.extras.noballs;

/** "17.3" style display from a legal-ball count. Never stored, never parsed back. */
export function oversDisplay(legalBalls: number, ballsPerOver = 6): string {
  const o = Math.floor(legalBalls / ballsPerOver);
  const b = legalBalls % ballsPerOver;
  return b === 0 ? `${o}` : `${o}.${b}`;
}

export function strikeRate(runs: number, balls: number): number | null {
  return balls > 0 ? (runs * 100) / balls : null;
}

export function economy(runs: number, legalBalls: number, ballsPerOver = 6): number | null {
  return legalBalls > 0 ? (runs * ballsPerOver) / legalBalls : null;
}

export function average(runs: number, dismissals: number): number | null {
  return dismissals > 0 ? runs / dismissals : null;
}
