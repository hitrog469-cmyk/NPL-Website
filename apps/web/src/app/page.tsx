import Link from "next/link";
import { oversDisplay } from "@npl/cricket-core";
import { Tag } from "@/components/Tag";
import { coverage, ds, finals, lastTeamOf, playerName, records, resultLine, s3Fixtures, s3Season, scored, seasonLabel, team, winnerOf } from "@/lib/data";
import { daysBetween, fixed, matchDate, todayKathmandu } from "@/lib/format";

export default function Home() {
  const s3 = s3Season();
  const fixtures = s3Fixtures();
  const today = todayKathmandu();
  const start = s3.window?.start ?? null;
  const end = s3.window?.end ?? null;
  const days = start ? daysBetween(today, start) : null;
  const rec = records();
  const cov = coverage();
  const runs = rec.mostRuns.slice(0, 6);
  const wkts = rec.mostWickets.slice(0, 6);
  const hs = rec.highestScores.slice(0, 5);

  return (
    <>
      {/* SEASON BOARD — pre-season state. Switches to the confrontation/score board once fixtures are approved. */}
      <section className="ink" aria-labelledby="board-title">
        <div className="wrap board">
          <div className="board-main">
            <p className="label muted wipe">Nepal Premier League · Kirtipur</p>
            <h1 id="board-title" className="display board-title wipe wipe-2">
              Season <span className="accent">3</span>
            </h1>
            {start && end && (
              <div className="board-dates wipe wipe-3">
                <span className="display num">{matchDate(start, { year: false })}</span>
                <span className="sep" aria-hidden />
                <span className="display num">{matchDate(end)}</span>
              </div>
            )}
          </div>
          <aside className="board-rail">
            {days !== null && days > 0 && (
              <div>
                <p className="label muted">First ball in</p>
                <div className="countdown">
                  <span className="display num">{days}</span>
                  <span className="display" style={{ fontSize: "2rem" }}>day{days === 1 ? "" : "s"}</span>
                </div>
              </div>
            )}
            <div className="facts">
              <div><span className="display num">8</span><span className="label muted">Teams</span></div>
              <div><span className="display num">28</span><span className="label muted">League</span></div>
              <div><span className="display num">4</span><span className="label muted">Playoffs</span></div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Tag kind="admin_reported">Dates &amp; format: editor reported</Tag>
              {fixtures.status !== "approved" && <Tag kind="pending">Fixture sheet pending</Tag>}
            </div>
          </aside>
        </div>
      </section>

      {/* FIXTURES RAIL — designed empty state until the official sheet is approved. */}
      <section className="bone section" aria-labelledby="teams-h">
        <div className="wrap">
          <div className="sec-head">
            <h2 id="teams-h" className="display">The eight</h2>
            <p className="aside muted">
              {fixtures.status === "approved"
                ? `${fixtures.fixtures.length} fixtures published`
                : "Fixtures appear here once the official schedule is checked and approved. We never copy third-party schedules."}
            </p>
          </div>
          <div className="team-rail">
            {ds().teams.map((t) => (
              <div key={t.id} className="team-cell">
                <span className="display" aria-hidden>{t.shortName}</span>
                <span className="name">{t.name}</span>
              </div>
            ))}
          </div>
          <p className="caption">Team names shown as plain text. Spellings pending official confirmation (Gorkhas / Gurkhas both appear in past data).</p>
        </div>
      </section>

      {/* ROAD SO FAR — the two finals. */}
      <section className="ink section" aria-labelledby="finals-h">
        <div className="wrap">
          <div className="sec-head">
            <h2 id="finals-h" className="display">Two finals so far</h2>
            <p className="aside muted"><Tag kind="historical_imported" /></p>
          </div>
          <div className="finals">
            {finals().map((m) => {
              const { cards } = scored(m);
              const w = winnerOf(m);
              return (
                <Link key={m.id} href={`/matches/${m.id}`} className="final">
                  <span className="label muted">{seasonLabel(m.seasonId)} final · {matchDate(m.date)}</span>
                  <span className="display winner">{w ? team(w).name : "—"}</span>
                  <div className="score-line">
                    {cards.map((c) => (
                      <span key={c.battingTeam}>
                        <span className="label muted">{team(c.battingTeam).shortName} </span>
                        <span className="display num">{c.runs}/{c.wickets}</span>{" "}
                        <span className="muted">({oversDisplay(c.legalBalls)})</span>
                      </span>
                    ))}
                  </div>
                  <span className="muted">{resultLine(m)}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* LEADERS — three deliberately different blocks. */}
      <section className="paper section" aria-labelledby="leaders-h">
        <div className="wrap">
          <div className="sec-head">
            <h2 id="leaders-h" className="display">All-time leaders</h2>
            <p className="aside muted">
              Based on {cov.matches} NPL matches, {cov.first && matchDate(cov.first)} – {cov.last && matchDate(cov.last)}.{" "}
              <Link href="/records">All records</Link>
            </p>
          </div>
          <div className="leaders">
            <div>
              <p className="label muted">Most runs</p>
              {runs[0] && (
                <div className="tower-top">
                  <span className="display big num">{runs[0].runs}</span>
                  <span className="display who">{playerName(runs[0].player)}</span>
                  <span className="label muted">
                    {runs[0].innings} inns · avg {fixed(runs[0].avg)} · SR {fixed(runs[0].sr, 1)}
                  </span>
                </div>
              )}
              <ol className="rank-list" start={2}>
                {runs.slice(1).map((b, i) => (
                  <li key={b.player}>
                    <span className="r">{i + 2}</span>
                    <span>{playerName(b.player)}<span className="sub">{team(lastTeamOf(b.player) ?? "").name} · {b.innings} inns</span></span>
                    <span className="v num">{b.runs}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="label muted">Most wickets</p>
              {wkts[0] && (
                <div className="tower-top">
                  <span className="display big num">{wkts[0].wickets}</span>
                  <span className="display who">{playerName(wkts[0].player)}</span>
                  <span className="label muted">econ {fixed(wkts[0].econ)} · best {wkts[0].best?.wickets}/{wkts[0].best?.runs}</span>
                </div>
              )}
              <ol className="rank-list" start={2}>
                {wkts.slice(1).map((b, i) => (
                  <li key={b.player}>
                    <span className="r">{i + 2}</span>
                    <span>{playerName(b.player)}<span className="sub">{team(lastTeamOf(b.player) ?? "").name}</span></span>
                    <span className="v num">{b.wickets}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div>
              <p className="label muted">Highest scores</p>
              <ol className="rank-list" style={{ borderTop: "3px solid var(--on-bone)", marginTop: 8 }}>
                {hs.map((h, i) => (
                  <li key={`${h.player}-${h.ref.matchId}`}>
                    <span className="r">{i + 1}</span>
                    <span>
                      <Link href={`/matches/${h.ref.matchId}`}>{playerName(h.player)}</Link>
                      <span className="sub">{h.balls} balls · v {team(h.ref.opponent).shortName} · {matchDate(h.ref.date)}</span>
                    </span>
                    <span className="v num">{h.runs}{h.notOut ? "*" : ""}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
