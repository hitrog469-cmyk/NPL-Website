import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { Match, Player, Team } from "@npl/cricket-core";
import { parseCricsheet, type CricsheetMatch } from "./cricsheet";

export interface Season {
  id: string;
  label: string;
  year: number;
  cricsheetSeason: string | null;
  status: "completed" | "upcoming" | "live";
  window?: { start: string; end: string; source: string };
  plannedFormat?: string;
}

export interface ImportManifestEntry {
  id: string;
  file: string;
  sha256: string;
  dataVersion: string;
  revision: number;
  created: string;
  importedAt: string;
}

export interface ImportManifest {
  source: string;
  licence: string;
  parserVersion: string;
  matches: ImportManifestEntry[];
}

export interface Dataset {
  teams: Team[];
  seasons: Season[];
  matches: Match[];
  players: Map<string, Player>;
  manifest: ImportManifest;
  warnings: string[];
}

/** Walk up from cwd to the repo root (the folder holding data/teams.json). */
export function dataDir(): string {
  if (process.env.NPL_DATA_DIR) return process.env.NPL_DATA_DIR;
  let dir = process.cwd();
  for (;;) {
    if (existsSync(path.join(dir, "data", "teams.json"))) return path.join(dir, "data");
    const parent = path.dirname(dir);
    if (parent === dir) throw new Error("Could not locate data/teams.json above " + process.cwd());
    dir = parent;
  }
}

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, "utf8")) as T;

let cached: Dataset | null = null;

export function loadDataset(): Dataset {
  if (cached) return cached;
  const dir = dataDir();
  const teams = readJson<{ teams: Team[] }>(path.join(dir, "teams.json")).teams;
  const seasons = readJson<{ seasons: Season[] }>(path.join(dir, "seasons.json")).seasons;
  const csDir = path.join(dir, "cricsheet", "npl");
  const manifest = readJson<ImportManifest>(path.join(csDir, "manifest.json"));

  const teamIdByAlias = new Map<string, string>();
  for (const t of teams) for (const a of [t.name, ...t.aliases]) teamIdByAlias.set(a, t.id);
  const seasonIdByCricsheet = new Map(seasons.filter((s) => s.cricsheetSeason).map((s) => [s.cricsheetSeason!, s.id]));
  // NPL seasons sit inside one calendar year, so a new Cricsheet season label
  // (e.g. Season 3's) still maps by year without anyone editing seasons.json.
  const seasonIdByYear = new Map(seasons.map((s) => [s.year, s.id]));

  const matches: Match[] = [];
  const players = new Map<string, Player>();
  const warnings: string[] = [];
  const files = readdirSync(csDir).filter((f) => /^\d+\.json$/.test(f));
  const sha = new Map(manifest.matches.map((m) => [m.file, m.sha256]));
  for (const f of files) {
    const id = f.replace(".json", "");
    const parsed = parseCricsheet(id, readJson<CricsheetMatch>(path.join(csDir, f)), sha.get(f) ?? null, { teamIdByAlias, seasonIdByCricsheet, seasonIdByYear });
    matches.push(parsed.match);
    // Later matches win so the most recent spelling of a name is used.
    for (const p of parsed.players) players.set(p.id, p);
    warnings.push(...parsed.warnings.map((w) => `[${id}] ${w}`));
  }
  matches.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  cached = { teams, seasons, matches, players, manifest, warnings };
  return cached;
}
