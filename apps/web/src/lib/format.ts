import { SITE } from "./site";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Format a YYYY-MM-DD local match date. Parsed by hand so it can never shift
 * with the server's or visitor's timezone.
 */
export function matchDate(iso: string, opts: { weekday?: boolean; year?: boolean } = {}): string {
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  const wd = DAYS[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${opts.weekday ? wd + " " : ""}${d} ${MONTHS[m - 1]}${opts.year === false ? "" : " " + y}`;
}

/** Today's date in Kathmandu as YYYY-MM-DD. */
export function todayKathmandu(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: SITE.timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Whole days from a to b, both YYYY-MM-DD. */
export function daysBetween(a: string, b: string): number {
  const t = (s: string) => {
    const [y, m, d] = s.split("-").map(Number) as [number, number, number];
    return Date.UTC(y, m - 1, d);
  };
  return Math.round((t(b) - t(a)) / 86_400_000);
}

export const fixed = (n: number | null, digits = 2) => (n === null ? "–" : n.toFixed(digits));

export const signed = (n: number | null, digits = 3) => (n === null ? "–" : (n > 0 ? "+" : "") + n.toFixed(digits));
