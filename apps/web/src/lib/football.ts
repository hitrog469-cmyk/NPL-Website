import "server-only";
import { unstable_cache } from "next/cache";

/**
 * football-data.org v4 (free plan). Licensed feed; we credit it on every page.
 * The free plan allows 10 requests a minute, so every response is cached by
 * Next's data cache and pages regenerate at most every few minutes. If the
 * feed is down or the key is missing, callers get null and render an honest
 * "unavailable" state; ISR keeps serving the last good page.
 */

export const FOOTBALL = [
  { code: "PL", name: "Premier League", short: "Premier League", area: "England", cup: false },
  { code: "CL", name: "UEFA Champions League", short: "Champions League", area: "Europe", cup: true },
  { code: "PD", name: "La Liga", short: "La Liga", area: "Spain", cup: false },
  { code: "SA", name: "Serie A", short: "Serie A", area: "Italy", cup: false },
  { code: "BL1", name: "Bundesliga", short: "Bundesliga", area: "Germany", cup: false },
  { code: "FL1", name: "Ligue 1", short: "Ligue 1", area: "France", cup: false },
  { code: "WC", name: "FIFA World Cup", short: "World Cup", area: "World", cup: true },
  { code: "EC", name: "UEFA European Championship", short: "Euros", area: "Europe", cup: true },
] as const;

export type FootballCode = (typeof FOOTBALL)[number]["code"];
export const footballComp = (code: string) => FOOTBALL.find((c) => c.code === code);

export interface FdTeam { id: number; name: string; shortName: string; tla: string; crest: string }
export interface FdRow {
  position: number;
  team: FdTeam;
  playedGames: number;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  form: string | null;
}
export interface FdStandings {
  season: { startDate: string; endDate: string; currentMatchday: number | null };
  standings: { stage: string; type: "TOTAL" | "HOME" | "AWAY"; group: string | null; table: FdRow[] }[];
}
export interface FdMatch {
  id: number;
  utcDate: string;
  status: "SCHEDULED" | "TIMED" | "IN_PLAY" | "PAUSED" | "FINISHED" | "SUSPENDED" | "POSTPONED" | "CANCELLED" | "AWARDED";
  matchday: number | null;
  stage: string;
  group: string | null;
  homeTeam: FdTeam;
  awayTeam: FdTeam;
  score: { winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null; duration: string; fullTime: { home: number | null; away: number | null } };
}
export interface FdScorer { player: { id: number; name: string; nationality: string | null }; team: FdTeam; playedMatches: number; goals: number; assists: number | null; penalties: number | null }

/**
 * Only successful responses are cached: a failure throws inside
 * unstable_cache (which never stores a throw) and the caller gets null, so a
 * bad minute can't stick on the site for the whole revalidate window.
 */
async function fd<T>(path: string, revalidate: number): Promise<T | null> {
  const key = process.env.FOOTBALL_DATA_KEY;
  if (!key) return null;
  const load = unstable_cache(
    async () => {
      const res = await fetch(`https://api.football-data.org/v4/${path}`, { headers: { "X-Auth-Token": key }, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return (await res.json()) as T;
    },
    ["football-data", path],
    { revalidate, tags: ["football"] },
  );
  try {
    return await load();
  } catch (e) {
    console.warn(`football-data ${path}: ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

export const standings = (code: string) => fd<FdStandings>(`competitions/${code}/standings`, 1800);
export const scorers = (code: string) => fd<{ scorers: FdScorer[] }>(`competitions/${code}/scorers?limit=10`, 3600);
/** Results from the last three weeks and fixtures for the next three. */
export const matchesAround = (code: string) => fd<{ matches: FdMatch[] }>(`competitions/${code}/matches?dateFrom=${day(-21)}&dateTo=${day(21)}`, 600);

export const isLive = (m: FdMatch) => m.status === "IN_PLAY" || m.status === "PAUSED";
export const totalTable = (s: FdStandings | null) => s?.standings.filter((x) => x.type === "TOTAL") ?? [];
