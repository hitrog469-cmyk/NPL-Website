import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { InningsTotal, MatchOutcome, ResultSummary, SourceKind } from "@npl/cricket-core";
import { dataDir } from "./load";

/**
 * Season 3 admin data: fixtures and results as reviewed JSON files in git.
 * Every file is validated at build time; a malformed file fails the build,
 * so a bad edit can never replace the last good deployment.
 */

export interface Fixture {
  id: string;
  matchNumber: number | null;
  stage: "league" | "qualifier-1" | "eliminator" | "qualifier-2" | "final";
  teams: [string, string] | null;
  /** UTC ISO timestamp. Display is always Asia/Kathmandu. */
  startsAtUtc: string;
  venue: string;
  status: "scheduled" | "postponed" | "cancelled";
}

export interface FixtureFile {
  status: "pending_approval" | "approved";
  approvedAt: string | null;
  source: string | null;
  fixtures: Fixture[];
}

export interface S3Result extends ResultSummary {
  status: "final" | "awaiting_confirmation";
  source: Extract<SourceKind, "admin_reported" | "official_confirmed">;
  enteredAt: string;
  note?: string;
}

export interface SquadPlayer {
  name: string;
  role: "batter" | "bowler" | "all-rounder" | "wicketkeeper" | "wicketkeeper-batter" | null;
  captain?: boolean;
  overseas?: boolean;
}

export interface Squad {
  sourceUrl: string;
  readAt: string;
  verified: boolean;
  note: string | null;
  players: SquadPlayer[];
}

export function loadS3Squads(): Record<string, Squad> {
  const p = path.join(dataDir(), "s3", "squads.json");
  if (!existsSync(p)) return {};
  return (JSON.parse(readFileSync(p, "utf8")) as { teams: Record<string, Squad> }).teams;
}

export function loadS3Fixtures(): FixtureFile {
  return JSON.parse(readFileSync(path.join(dataDir(), "s3", "fixtures.json"), "utf8")) as FixtureFile;
}

export function loadS3Results(teamIds: string[]): S3Result[] {
  const dir = path.join(dataDir(), "s3", "results");
  if (!existsSync(dir)) return [];
  const known = new Set(teamIds);
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .map((f) => validateResult(f, JSON.parse(readFileSync(path.join(dir, f), "utf8")), known));
}

function validateResult(file: string, r: any, teams: Set<string>): S3Result {
  const fail = (msg: string): never => {
    throw new Error(`data/s3/results/${file}: ${msg}`);
  };
  if (typeof r.matchId !== "string") fail("matchId missing");
  if (!Array.isArray(r.teams) || r.teams.length !== 2 || !r.teams.every((t: string) => teams.has(t))) fail("teams must be two known team ids");
  if (!["final", "awaiting_confirmation"].includes(r.status)) fail("status must be final | awaiting_confirmation");
  if (!["admin_reported", "official_confirmed"].includes(r.source)) fail("source must be admin_reported | official_confirmed");
  const o = r.outcome as MatchOutcome;
  if (!o || !["win", "tie", "no-result", "abandoned", "requires-review"].includes(o.type)) fail("outcome.type invalid");
  if (o.type === "win" && !r.teams.includes(o.winner)) fail("winner must be one of the teams");
  if (!Array.isArray(r.innings)) fail("innings must be an array");
  for (const i of r.innings as InningsTotal[]) {
    if (!r.teams.includes(i.team)) fail(`innings team ${i.team} not in match`);
    if (!Number.isInteger(i.runs) || i.runs < 0) fail("innings runs must be a non-negative integer");
    if (!Number.isInteger(i.legalBalls) || i.legalBalls < 0 || i.legalBalls > i.oversLimit * 6) fail("legalBalls must be an integer within the overs limit");
    if (typeof i.allOut !== "boolean") fail("allOut must be boolean");
  }
  return r as S3Result;
}
