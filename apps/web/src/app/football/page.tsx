import type { Metadata } from "next";
import Link from "next/link";
import { FdCredit, LeagueTable } from "@/components/football/FdBits";
import { FOOTBALL, isNone, standings, totalTable } from "@/lib/football";

export const metadata: Metadata = { title: "Football", description: "Premier League, Champions League, La Liga, Serie A, Bundesliga, Ligue 1, World Cup and Euros: tables, fixtures, results and top scorers." };
export const revalidate = 600;

export default async function Football() {
  // Eight requests at most, inside the free plan's 10 a minute; good data cached 30 minutes, page re-checked every 10.
  const tables = await Promise.all(FOOTBALL.map(async (c) => ({ c, s: await standings(c.code) })));
  const anyData = tables.some((t) => t.s && !isNone(t.s));

  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted">Tables · fixtures · results · top scorers</p>
          <h1 className="display">Football</h1>
          <p className="lead muted">Europe&rsquo;s top leagues and the big international tournaments, alongside our cricket.</p>
        </div>
      </section>
      <section className="bone section">
        <div className="wrap">
          {!anyData && (
            <div className="notice" style={{ marginBottom: 32 }}>
              <strong>Football feed unavailable right now.</strong>
              <span className="muted">Tables appear here as soon as the feed responds. Nothing below is placeholder data.</span>
            </div>
          )}
          <div className="fd-grid">
            {tables.map(({ c, s }) => {
              const groups = totalTable(s);
              const rows = groups.length === 1 ? groups[0]!.table.slice(0, 4) : [];
              return (
                <Link key={c.code} href={`/football/${c.code.toLowerCase()}`} className="fd-card">
                  <span className="label muted">{c.area}</span>
                  <span className="display fd-card-name">{c.short}</span>
                  {rows.length ? (
                    <LeagueTable rows={rows} compact />
                  ) : (
                    <span className="muted">{isNone(s) ? "Not in progress" : s ? (groups.length > 1 ? `${groups.length} groups · open for tables and fixtures` : "Not in season · open for results") : "Feed unavailable"}</span>
                  )}
                </Link>
              );
            })}
          </div>
          <FdCredit />
        </div>
      </section>
    </>
  );
}
