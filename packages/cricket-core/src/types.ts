/**
 * Canonical cricket domain types. Every surface (pages, exports, overlays)
 * consumes these; nothing outside cricket-core does cricket arithmetic.
 */

export type PlayerId = string;
export type TeamId = string;

/** Provenance state shown next to every number in the UI. */
export type SourceKind =
  | "official_confirmed"
  | "admin_reported"
  | "provisional_live"
  | "historical_imported"
  | "model_estimated"
  | "hypothetical"
  | "unavailable";

export interface Provenance {
  kind: SourceKind;
  /** e.g. "cricsheet:1462596" or "admin:s3-m01" */
  sourceId: string;
  sourceRevision: number | null;
  checksum: string | null;
  recordedAt: string | null;
  verifiedAt: string | null;
}

export type WicketKind =
  | "bowled"
  | "caught"
  | "caught and bowled"
  | "lbw"
  | "stumped"
  | "hit wicket"
  | "run out"
  | "retired hurt"
  | "retired not out"
  | "retired out"
  | "obstructing the field"
  | "handled the ball"
  | "hit the ball twice"
  | "timed out";

export interface Wicket {
  kind: WicketKind;
  playerOut: PlayerId;
  fielders: PlayerId[];
}

export interface Extras {
  wides: number;
  noballs: number;
  byes: number;
  legbyes: number;
  penalty: number;
}

/**
 * One delivery as bowled, legal or not. `seq` is the integer order within
 * the innings and is the only ordering key: wides and no-balls get their own
 * seq so repeated illegal deliveries never collide.
 */
export interface Delivery {
  seq: number;
  /** 0-based over index as recorded by the source. */
  over: number;
  batter: PlayerId;
  nonStriker: PlayerId;
  bowler: PlayerId;
  runsBat: number;
  extras: Extras;
  /** True only for a ball that reached/cleared the rope. A run four is false. */
  isBoundary: boolean;
  wickets: Wicket[];
}

export interface Innings {
  battingTeam: TeamId;
  bowlingTeam: TeamId;
  isSuperOver: boolean;
  /** Overs allotted to this innings (20, or reduced). */
  oversLimit: number;
  target: { runs: number; overs: number } | null;
  deliveries: Delivery[];
}

export type MatchStage = "league" | "qualifier-1" | "eliminator" | "qualifier-2" | "final";

export type MatchOutcome =
  | { type: "win"; winner: TeamId; by: { runs?: number; wickets?: number }; method: string | null }
  | { type: "tie"; superOverWinner: TeamId | null }
  | { type: "no-result" }
  | { type: "abandoned" }
  | { type: "requires-review"; note: string };

export interface Match {
  id: string;
  seasonId: string;
  stage: MatchStage;
  matchNumber: number | null;
  date: string; // YYYY-MM-DD, local match date
  venue: string;
  teams: [TeamId, TeamId];
  toss: { winner: TeamId; decision: "bat" | "field" } | null;
  outcome: MatchOutcome;
  playerOfMatch: PlayerId[];
  squads: Record<TeamId, PlayerId[]>;
  innings: Innings[];
  provenance: Provenance;
}

export interface Player {
  id: PlayerId;
  /** Name exactly as the source prints it. */
  name: string;
  cricsheetId: string | null;
}

export interface Team {
  id: TeamId;
  name: string;
  shortName: string;
  aliases: string[];
  /** Verified palette; null until admin enters it. */
  colour: string | null;
  spellingVerified: boolean;
}
