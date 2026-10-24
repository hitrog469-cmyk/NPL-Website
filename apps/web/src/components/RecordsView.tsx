import Link from "next/link";
import { oversDisplay } from "@npl/cricket-core";
import { Tag } from "@/components/Tag";
import { coverage, historicalSeasons, lastTeamOf, playerName, QUALIFIERS, records, seasonLabel, team } from "@/lib/data";
import { fixed, matchDate } from "@/lib/format";

function Coverage({ seasonId }: { seasonId?: string }) {
  const c = coverage(seasonId);
  return (
    <p className="caption">
      <Tag kind="historical_imported" />
      <span>
        Based on {c.matches} matches in the Cricsheet archive, {c.first && matchDate(c.first)} – {c.last && matchDate(c.last)}. Super Overs excluded.
      </span>
    </p>
  );
}

const M = ({ id, children }: { id: string; children: React.ReactNode }) => <Link href={`/matches/${id}`}>{children}</Link>;
const teamOf = (p: string, s?: string) => team(lastTeamOf(p, s) ?? "").shortName;

export function RecordsView({ seasonId }: { seasonId?: string }) {
  const r = records(seasonId);
  const scope = seasonId ? seasonLabel(seasonId) : "All seasons";

  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted">NPL records · {scope}</p>
          <h1 className="display">Records</h1>
          <p className="lead muted">Every number is folded from the ball-by-ball record. Click any match to see the deliveries behind it.</p>
        </div>
      </section>

      <section className="bone section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <nav className="tabs" aria-label="Season" style={{ paddingTop: 16 }}>
            <Link href="/records" aria-current={!seasonId ? "page" : undefined}>All seasons</Link>
            {historicalSeasons().map((s) => (
              <Link key={s.id} href={`/records/${s.id}`} aria-current={seasonId === s.id ? "page" : undefined}>
                {s.label} · {s.year}
              </Link>
            ))}
          </nav>

          <div className="records-grid">
            <div className="record span-7">
              <h2 className="display">Most runs</h2>
              <p className="def">Average = runs ÷ dismissals (retired hurt counts as not out). Strike rate = runs per 100 balls faced; wides are not balls faced.</p>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th className="l">#</th><th className="l">Player</th><th>M</th><th>Inn</th><th>NO</th><th>Runs</th><th>HS</th><th>Avg</th><th>SR</th><th>50/100</th></tr></thead>
                  <tbody>
                    {r.mostRuns.map((b, i) => (
                      <tr key={b.player} className={i === 0 ? "top" : ""}>
                        <td className="l rank">{i + 1}</td>
                        <td className="l strong">{playerName(b.player)}<span className="sub">{teamOf(b.player, seasonId)}</span></td>
                        <td>{b.matches}</td><td>{b.innings}</td><td>{b.notOuts}</td>
                        <td className="big">{b.runs}</td>
                        <td>{b.highest && <M id={b.highest.ref.matchId}>{b.highest.runs}{b.highest.notOut ? "*" : ""}</M>}</td>
                        <td>{fixed(b.avg)}</td><td>{fixed(b.sr)}</td><td>{b.fifties}/{b.hundreds}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Coverage seasonId={seasonId} />
            </div>

            <div className="record span-5">
              <h2 className="display">Highest scores</h2>
              <p className="def">Single innings. * not out.</p>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th className="l">#</th><th className="l">Player</th><th>Runs</th><th>B</th><th>4s/6s</th><th className="l">Match</th></tr></thead>
                  <tbody>
                    {r.highestScores.map((h, i) => (
                      <tr key={`${h.player}-${h.ref.matchId}`} className={i === 0 ? "top" : ""}>
                        <td className="l rank">{i + 1}</td>
                        <td className="l strong">{playerName(h.player)}<span className="sub">{team(h.ref.team).shortName}</span></td>
                        <td className="big">{h.runs}{h.notOut ? "*" : ""}</td><td>{h.balls}</td><td>{h.fours}/{h.sixes}</td>
                        <td className="l"><M id={h.ref.matchId}>v {team(h.ref.opponent).shortName}</M><span className="sub">{matchDate(h.ref.date)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="record span-7">
              <h2 className="display">Most wickets</h2>
              <p className="def">Bowler&rsquo;s wickets only: run outs and retirements are not credited. Economy = runs conceded (incl. wides and no-balls, excl. byes and leg-byes) per six legal balls.</p>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th className="l">#</th><th className="l">Player</th><th>M</th><th>Overs</th><th>Runs</th><th>Wkts</th><th>Best</th><th>Avg</th><th>Econ</th><th>Dots</th></tr></thead>
                  <tbody>
                    {r.mostWickets.map((b, i) => (
                      <tr key={b.player} className={i === 0 ? "top" : ""}>
                        <td className="l rank">{i + 1}</td>
                        <td className="l strong">{playerName(b.player)}<span className="sub">{teamOf(b.player, seasonId)}</span></td>
                        <td>{b.matches}</td><td>{oversDisplay(b.legalBalls)}</td><td>{b.runs}</td>
                        <td className="big">{b.wickets}</td>
                        <td>{b.best && <M id={b.best.ref.matchId}>{b.best.wickets}/{b.best.runs}</M>}</td>
                        <td>{fixed(b.avg)}</td><td>{fixed(b.econ)}</td><td>{b.dots}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Coverage seasonId={seasonId} />
            </div>

            <div className="record span-5">
              <h2 className="display">Best figures</h2>
              <p className="def">Most wickets in an innings, then fewest runs.</p>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th className="l">#</th><th className="l">Player</th><th>Fig.</th><th>Overs</th><th className="l">Match</th></tr></thead>
                  <tbody>
                    {r.bestFigures.map((f, i) => (
                      <tr key={`${f.player}-${f.ref.matchId}`} className={i === 0 ? "top" : ""}>
                        <td className="l rank">{i + 1}</td>
                        <td className="l strong">{playerName(f.player)}<span className="sub">{team(f.ref.team).shortName}</span></td>
                        <td className="big">{f.wickets}/{f.runs}</td><td>{oversDisplay(f.legalBalls)}</td>
                        <td className="l"><M id={f.ref.matchId}>v {team(f.ref.opponent).shortName}</M><span className="sub">{matchDate(f.ref.date)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="record span-6">
              <h2 className="display">Fastest scorers</h2>
              <p className="def">Career strike rate, minimum {QUALIFIERS.strikeRateMinBalls} balls faced.</p>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th className="l">#</th><th className="l">Player</th><th>Balls</th><th>Runs</th><th>SR</th></tr></thead>
                  <tbody>
                    {r.bestStrikeRate.map((b, i) => (
                      <tr key={b.player} className={i === 0 ? "top" : ""}>
                        <td className="l rank">{i + 1}</td>
                        <td className="l strong">{playerName(b.player)}<span className="sub">{teamOf(b.player, seasonId)}</span></td>
                        <td>{b.balls}</td><td>{b.runs}</td><td className="big">{fixed(b.sr)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {r.bestStrikeRate.length === 0 && <p className="caption">No player has faced {QUALIFIERS.strikeRateMinBalls} balls in this selection.</p>}
            </div>

            <div className="record span-6">
              <h2 className="display">Tightest bowlers</h2>
              <p className="def">Career economy, minimum {QUALIFIERS.economyMinBalls / 6} overs.</p>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th className="l">#</th><th className="l">Player</th><th>Overs</th><th>Runs</th><th>Econ</th></tr></thead>
                  <tbody>
                    {r.bestEconomy.map((b, i) => (
                      <tr key={b.player} className={i === 0 ? "top" : ""}>
                        <td className="l rank">{i + 1}</td>
                        <td className="l strong">{playerName(b.player)}<span className="sub">{teamOf(b.player, seasonId)}</span></td>
                        <td>{oversDisplay(b.legalBalls)}</td><td>{b.runs}</td><td className="big">{fixed(b.econ)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {r.bestEconomy.length === 0 && <p className="caption">No bowler has bowled {QUALIFIERS.economyMinBalls / 6} overs in this selection.</p>}
            </div>

            <div className="record span-6">
              <h2 className="display">Most sixes</h2>
              <p className="def">Ball cleared the rope. Hit off a no-ball counts.</p>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th className="l">#</th><th className="l">Player</th><th>Inn</th><th>4s</th><th>6s</th></tr></thead>
                  <tbody>
                    {r.mostSixes.map((b, i) => (
                      <tr key={b.player} className={i === 0 ? "top" : ""}>
                        <td className="l rank">{i + 1}</td>
                        <td className="l strong">{playerName(b.player)}<span className="sub">{teamOf(b.player, seasonId)}</span></td>
                        <td>{b.innings}</td><td>{b.fours}</td><td className="big">{b.sixes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="record span-6">
              <h2 className="display">Team totals</h2>
              <p className="def">Highest innings totals, and lowest completed totals (all out, or batted the full overs).</p>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th className="l">Highest</th><th>Score</th><th>Ov</th><th className="l">Match</th></tr></thead>
                  <tbody>
                    {r.highestTotals.slice(0, 5).map((t, i) => (
                      <tr key={`${t.team}-${t.ref.matchId}`} className={i === 0 ? "top" : i === 4 ? "cut" : ""}>
                        <td className="l strong">{team(t.team).name}</td>
                        <td className="big">{t.runs}/{t.wickets}</td><td>{oversDisplay(t.legalBalls)}</td>
                        <td className="l"><M id={t.ref.matchId}>v {team(t.ref.opponent).shortName}</M><span className="sub">{matchDate(t.ref.date)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                  <tbody>
                    <tr><th className="l" colSpan={4} scope="rowgroup" style={{ paddingTop: 20 }}>Lowest</th></tr>
                    {r.lowestTotals.slice(0, 5).map((t) => (
                      <tr key={`${t.team}-${t.ref.matchId}`}>
                        <td className="l strong">{team(t.team).name}</td>
                        <td className="big">{t.runs}{t.allOut ? "" : `/${t.wickets}`}</td><td>{oversDisplay(t.legalBalls)}</td>
                        <td className="l"><M id={t.ref.matchId}>v {team(t.ref.opponent).shortName}</M><span className="sub">{matchDate(t.ref.date)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
