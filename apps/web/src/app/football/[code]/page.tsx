import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Crest, FdCredit, LeagueTable, MatchLine, Unavailable } from "@/components/football/FdBits";
import { footballComp, isLive, matchesAround, scorers, standings, totalTable } from "@/lib/football";
import { matchDate } from "@/lib/format";

// Not prebuilt: each page is rendered on first visit and then refreshed every
// 10 minutes, so builds never spend the feed's rate limit.
export const revalidate = 600;
export const dynamicParams = true;
export function generateStaticParams() {
  return [];
}

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const c = footballComp((await params).code.toUpperCase());
  return c ? { title: c.short, description: `${c.name}: table, fixtures, results and top scorers.` } : {};
}

export default async function FootballCompetition({ params }: { params: Promise<{ code: string }> }) {
  const c = footballComp((await params).code.toUpperCase());
  if (!c) notFound();
  const [s, m, sc] = await Promise.all([standings(c.code), matchesAround(c.code), scorers(c.code)]);
  const groups = totalTable(s);
  const all = m?.matches ?? [];
  const live = all.filter(isLive);
  const results = all.filter((x) => x.status === "FINISHED" || x.status === "AWARDED").slice(-12).reverse();
  const fixtures = all.filter((x) => x.status === "SCHEDULED" || x.status === "TIMED" || x.status === "POSTPONED").slice(0, 12);

  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted"><Link href="/football">Football</Link> · {c.area}</p>
          <h1 className="display">{c.short}</h1>
          {s && <p className="lead muted">Season {s.season.startDate.slice(0, 4)}{s.season.endDate.slice(0, 4) !== s.season.startDate.slice(0, 4) ? `/${s.season.endDate.slice(2, 4)}` : ""}{s.season.currentMatchday ? ` · matchday ${s.season.currentMatchday}` : ""}</p>}
          <nav className="jump" aria-label="On this page">
            <a href="#matches">Matches</a>
            <a href="#table">{c.cup ? "Groups" : "Table"}</a>
            <a href="#scorers">Top scorers</a>
          </nav>
        </div>
      </section>

      <section className="bone section" id="matches">
        <div className="wrap fd-two">
          <div>
            {live.length > 0 && (
              <>
                <div className="sec-head"><h2 className="display">Live now</h2></div>
                <ul className="fd-list">{live.map((x) => <MatchLine key={x.id} m={x} />)}</ul>
              </>
            )}
            <div className="sec-head"><h2 className="display">Results</h2><p className="aside muted">Last three weeks</p></div>
            {m ? results.length ? <ul className="fd-list">{results.map((x) => <MatchLine key={x.id} m={x} />)}</ul> : <p className="muted">No results in the last three weeks.</p> : <Unavailable what="Results" />}
          </div>
          <div>
            <div className="sec-head"><h2 className="display">Fixtures</h2><p className="aside muted">Next three weeks · Nepal time</p></div>
            {m ? fixtures.length ? <ul className="fd-list">{fixtures.map((x) => <MatchLine key={x.id} m={x} />)}</ul> : <p className="muted">No fixtures in the next three weeks.</p> : <Unavailable what="Fixtures" />}
          </div>
        </div>
      </section>

      <section className="paper section" id="table">
        <div className="wrap">
          <div className="sec-head"><h2 className="display">{c.cup ? "Groups & standings" : "Table"}</h2></div>
          {!s ? <Unavailable what="The table" /> : groups.length === 0 ? <p className="muted">No standings published for this stage.</p> : (
            <div className={groups.length > 1 ? "fd-groups" : ""}>
              {groups.map((g) => (
                <div key={`${g.stage}-${g.group}`}>
                  {groups.length > 1 && <p className="label" style={{ margin: "16px 0 6px" }}>{(g.group ?? g.stage).replace(/_/g, " ")}</p>}
                  <LeagueTable rows={g.table} compact={groups.length > 1} />
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="bone section" id="scorers">
        <div className="wrap">
          <div className="sec-head"><h2 className="display">Top scorers</h2></div>
          {!sc ? <Unavailable what="Top scorers" /> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th className="l">#</th><th className="l">Player</th><th className="l">Team</th><th>Played</th><th>Goals</th><th>Assists</th><th>Pens</th></tr></thead>
                <tbody>
                  {sc.scorers.map((p, i) => (
                    <tr key={p.player.id} className={i === 0 ? "top" : ""}>
                      <td className="l rank">{i + 1}</td>
                      <td className="l strong">{p.player.name}<span className="sub">{p.player.nationality ?? ""}</span></td>
                      <td className="l"><span className="crest-name"><Crest team={p.team} />{p.team.shortName}</span></td>
                      <td>{p.playedMatches}</td><td className="big">{p.goals}</td><td>{p.assists ?? 0}</td><td>{p.penalties ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <FdCredit />
          <p className="caption">Page refreshed {matchDate(new Date().toISOString().slice(0, 10))}; updates every 10 minutes while people are reading it.</p>
        </div>
      </section>
    </>
  );
}
