import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ResultRow } from "@/components/cricket/ResultRow";
import { Tag } from "@/components/Tag";
import { competition, cricketIndex } from "@/lib/cricket";
import { fixed, matchDate } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return cricketIndex().map((c) => ({ comp: c.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ comp: string }> }): Promise<Metadata> {
  const c = competition((await params).comp);
  return c ? { title: c.name, description: `${c.name}: results, records, teams and scorecards from ${c.coverage.matches} matches.` } : {};
}

export default async function CompetitionPage({ params }: { params: Promise<{ comp: string }> }) {
  const c = competition((await params).comp);
  if (!c) notFound();
  const cards = new Set(c.scorecards);
  const r = c.records;
  const league = c.kind === "league";

  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted">Cricket · {c.format} · {league ? "League" : "International"}</p>
          <h1 className="display">{c.short}</h1>
          <p className="lead muted">
            {c.name}. {c.coverage.matches.toLocaleString("en-US")} matches, {c.coverage.first && matchDate(c.coverage.first)} – {c.coverage.last && matchDate(c.coverage.last)}.
          </p>
          <nav className="jump" aria-label="On this page">
            <a href="#results">Results</a>
            {league && <a href="#seasons">Champions</a>}
            <a href="#teams">Teams</a>
            <a href="#records">Records</a>
          </nav>
        </div>
      </section>

      <section className="bone section" id="results">
        <div className="wrap">
          <div className="sec-head"><h2 className="display">Latest results</h2><p className="aside muted">Scorecards for the {c.scorecards.length} most recent matches</p></div>
          <ul className="match-list">{c.recent.slice(0, 20).map((m) => <ResultRow key={m.id} m={m} comp={c.id} hasCard={cards.has(m.id)} />)}</ul>
        </div>
      </section>

      {league && (
        <section className="paper section" id="seasons">
          <div className="wrap">
            <div className="sec-head"><h2 className="display">Champions</h2></div>
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th className="l">Season</th><th className="l">Champion</th><th>Matches</th><th className="l">Dates</th></tr></thead>
                <tbody>
                  {c.seasons.map((s) => (
                    <tr key={s.season}><td className="l strong">{s.season}</td><td className="l big" style={{ fontSize: "1.1rem" }}>{s.champion ?? <span className="muted">–</span>}</td><td>{s.matches}</td><td className="l muted">{matchDate(s.first)} – {matchDate(s.last)}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="caption">Champion = winner of the match recorded as the final. Seasons without a recorded final show –.</p>
          </div>
        </section>
      )}

      <section className="bone section" id="teams">
        <div className="wrap">
          <div className="sec-head"><h2 className="display">Teams</h2><p className="aside muted">All matches in the archive</p></div>
          <div className="table-wrap">
            <table className="data">
              <thead><tr><th className="l">Team</th><th>P</th><th>W</th><th>L</th>{c.format === "Test" ? <th>D</th> : <th>T</th>}<th>NR</th><th>Win %</th><th className="l">Last match</th></tr></thead>
              <tbody>
                {c.teams.slice(0, league ? 30 : 40).map((t) => (
                  <tr key={t.team}>
                    <td className="l strong">{t.team}</td><td>{t.played}</td><td>{t.won}</td><td>{t.lost}</td><td>{c.format === "Test" ? t.drawn : t.tied}</td><td>{t.noResult}</td>
                    <td className="big">{t.played - t.noResult ? Math.round((t.won / (t.played - t.noResult)) * 100) : 0}</td>
                    <td className="l muted">{matchDate(t.last)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="paper section" id="records">
        <div className="wrap records-grid">
          <Rec title="Most runs" span={7} head={["Player", "M", "Inn", "Runs", "HS", "Avg", "SR", "100/50"]}>
            {r.mostRuns.map((b, i) => <tr key={b.player + i} className={i === 0 ? "top" : ""}><td className="l strong">{b.player}</td><td>{b.matches}</td><td>{b.innings}</td><td className="big">{b.runs}</td><td>{b.highest}</td><td>{fixed(b.average)}</td><td>{fixed(b.strikeRate)}</td><td>{b.hundreds}/{b.fifties}</td></tr>)}
          </Rec>
          <Rec title="Highest scores" span={5} head={["Player", "Runs", "B", "Match"]}>
            {r.highestScores.map((h, i) => <tr key={h.match + h.player} className={i === 0 ? "top" : ""}><td className="l strong">{h.player}<span className="sub">{h.team}</span></td><td className="big">{h.runs}{h.notOut ? "*" : ""}</td><td>{h.balls}</td><td className="l">v {h.opponent}<span className="sub">{matchDate(h.date)}</span></td></tr>)}
          </Rec>
          <Rec title="Most wickets" span={7} head={["Player", "M", "Overs", "Wkts", "Best", "Avg", "Econ"]}>
            {r.mostWickets.map((b, i) => <tr key={b.player + i} className={i === 0 ? "top" : ""}><td className="l strong">{b.player}</td><td>{b.matches}</td><td>{b.overs}</td><td className="big">{b.wickets}</td><td>{b.best}</td><td>{fixed(b.average)}</td><td>{fixed(b.economy)}</td></tr>)}
          </Rec>
          <Rec title="Best figures" span={5} head={["Player", "Fig.", "Ov", "Match"]}>
            {r.bestFigures.map((f, i) => <tr key={f.match + f.player} className={i === 0 ? "top" : ""}><td className="l strong">{f.player}<span className="sub">{f.team}</span></td><td className="big">{f.wickets}/{f.runs}</td><td>{f.overs}</td><td className="l">v {f.opponent}<span className="sub">{matchDate(f.date)}</span></td></tr>)}
          </Rec>
          <Rec title="Most sixes" span={6} head={["Player", "Inn", "4s", "6s"]}>
            {r.mostSixes.map((b, i) => <tr key={b.player + i} className={i === 0 ? "top" : ""}><td className="l strong">{b.player}</td><td>{b.innings}</td><td>{b.fours}</td><td className="big">{b.sixes}</td></tr>)}
          </Rec>
          <Rec title="Highest totals" span={6} head={["Team", "Score", "Ov", "Match"]}>
            {r.highestTotals.map((t, i) => <tr key={t.match + t.team} className={i === 0 ? "top" : ""}><td className="l strong">{t.team}</td><td className="big">{t.runs}/{t.wickets}</td><td>{t.overs}</td><td className="l">v {t.opponent}<span className="sub">{matchDate(t.date)}</span></td></tr>)}
          </Rec>
          {c.format !== "Test" && r.bestStrikeRate.length > 0 && (
            <Rec title="Fastest scorers" span={12} note={`Career strike rate, minimum ${r.minBalls} balls faced.`} head={["Player", "Balls", "Runs", "SR"]}>
              {r.bestStrikeRate.map((b, i) => <tr key={b.player + i} className={i === 0 ? "top" : ""}><td className="l strong">{b.player}</td><td>{b.balls}</td><td>{b.runs}</td><td className="big">{fixed(b.strikeRate)}</td></tr>)}
            </Rec>
          )}
          <p className="caption span-12">
            <Tag kind="historical_imported" /> Cricsheet ball-by-ball, men&rsquo;s matches, {c.coverage.matches.toLocaleString("en-US")} matches. Super Overs excluded. Names as Cricsheet prints them.
            {c.problems > 0 && ` ${c.problems} innings in the source record one ball more than the over limit (umpire miscounts); their runs and wickets still add up and are included.`}
          </p>
        </div>
      </section>
    </>
  );
}

function Rec({ title, span, head, note, children }: { title: string; span: number; head: string[]; note?: string; children: React.ReactNode }) {
  return (
    <div className={`record span-${span}`}>
      <h2 className="display">{title}</h2>
      {note && <p className="def">{note}</p>}
      <div className="table-wrap">
        <table className="data">
          <thead><tr>{head.map((h, i) => <th key={h} className={i === 0 || h === "Match" ? "l" : ""}>{h}</th>)}</tr></thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}
