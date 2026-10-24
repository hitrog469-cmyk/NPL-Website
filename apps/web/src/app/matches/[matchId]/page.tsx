import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { economy, oversDisplay, strikeRate, type InningsScorecard } from "@npl/cricket-core";
import { Tag } from "@/components/Tag";
import { dismissalText, ds, matchById, matchLabel, playerName, resultLine, scored, seasonLabel, team, winnerOf } from "@/lib/data";
import { fixed, matchDate } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return ds().matches.map((m) => ({ matchId: m.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ matchId: string }> }): Promise<Metadata> {
  const m = matchById((await params).matchId);
  if (!m) return {};
  return { title: `${team(m.teams[0]).name} v ${team(m.teams[1]).name} · ${matchDate(m.date)}`, description: resultLine(m) };
}

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const m = matchById((await params).matchId);
  if (!m) notFound();
  const { cards, superOvers } = scored(m);
  const w = winnerOf(m);
  const [a, b] = cards;

  return (
    <>
      <section className="ink">
        <div className="wrap">
          <div className="scoreboard">
            {a && <Side card={a} win={w === a.battingTeam} />}
            <span className="vs label">v</span>
            {b && <Side card={b} win={w === b.battingTeam} right />}
          </div>
          <div className="result-bar">
            <span className="res">{resultLine(m)}</span>
            <Tag kind="historical_imported">Final · Cricsheet {m.id} rev {m.provenance.sourceRevision}</Tag>
          </div>
        </div>
      </section>

      <section className="bone">
        <div className="wrap" style={{ paddingTop: 24 }}>
          <div className="meta-grid">
            <Meta k="Match" v={`${seasonLabel(m.seasonId)} · ${matchLabel(m)}`} />
            <Meta k="Date" v={matchDate(m.date, { weekday: true })} />
            <Meta k="Toss" v={m.toss ? `${team(m.toss.winner).name}, chose to ${m.toss.decision}` : "—"} />
            <Meta k="Player of the match" v={m.playerOfMatch.map(playerName).join(", ") || "—"} />
          </div>
          <p className="caption">{m.venue}</p>

          {cards.map((c, i) => <InningsCard key={i} card={c} n={i + 1} />)}

          {superOvers.length > 0 && (
            <div className="innings-block">
              <div className="innings-head"><h2 className="display">Super Over</h2></div>
              <div className="table-wrap">
                <table className="data">
                  <thead><tr><th className="l">Team</th><th>Score</th><th>Balls</th></tr></thead>
                  <tbody>
                    {superOvers.map((c, i) => (
                      <tr key={i}><td className="l strong">{team(c.battingTeam).name}</td><td className="big">{c.runs}/{c.wickets}</td><td>{c.legalBalls}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="caption">Super Over runs are not included in player or team records.</p>
            </div>
          )}

          <p className="caption" style={{ padding: "24px 0 48px" }}>
            <Link href="/matches">All matches</Link>
            <span>Source: Cricsheet match {m.id}, data revision {m.provenance.sourceRevision}, file checksum {m.provenance.checksum?.slice(0, 12)}…</span>
          </p>
        </div>
      </section>
    </>
  );
}

function Side({ card, win, right }: { card: InningsScorecard; win: boolean; right?: boolean }) {
  return (
    <div className={`side ${right ? "b" : ""} ${win ? "" : "lose"}`}>
      <span className="display tname">{team(card.battingTeam).name}</span>
      <span className="display score num wipe">{card.runs}/{card.wickets}</span>
      <span className="overs label">{oversDisplay(card.legalBalls)} overs{card.allOut ? " · all out" : ""}</span>
    </div>
  );
}

const Meta = ({ k, v }: { k: string; v: string }) => (
  <div><p className="label muted">{k}</p><p className="v">{v}</p></div>
);

function InningsCard({ card, n }: { card: InningsScorecard; n: number }) {
  const max = Math.max(...card.overs.map((o) => o.runs), 1);
  return (
    <div className="innings-block">
      <div className="innings-head">
        <h2 className="display">{n === 1 ? "1st" : "2nd"} innings · {team(card.battingTeam).shortName}</h2>
        <span className="display tot num">{card.runs}/{card.wickets} <span className="muted" style={{ fontSize: "0.5em" }}>({oversDisplay(card.legalBalls)})</span></span>
      </div>

      <div>
        <p className="label muted" style={{ marginBottom: 14 }}>Runs per over · first six overs (powerplay) shaded · square = wicket</p>
        <div className="over-strip trace" role="img" aria-label={card.overs.map((o) => `Over ${o.over + 1}: ${o.runs} runs${o.wickets ? `, ${o.wickets} wicket${o.wickets > 1 ? "s" : ""}` : ""}`).join("; ")}>
          {card.overs.map((o) => (
            <div key={o.over} className={`bar ${o.over < 6 ? "pp" : ""}`} style={{ height: `${(o.runs / max) * 100}%`, animationDelay: `${o.over * 18}ms` }}>
              {o.wickets > 0 && <span className="w" aria-hidden />}
            </div>
          ))}
        </div>
        <div className="over-axis" aria-hidden>{card.overs.map((o) => <span key={o.over}>{o.over + 1}</span>)}</div>
      </div>

      <div className="table-wrap">
        <table className="data">
          <thead><tr><th className="l">Batter</th><th className="l">Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
          <tbody>
            {card.batters.map((b) => (
              <tr key={b.player}>
                <td className="l strong">{playerName(b.player)}</td>
                <td className="l wrap-ok muted">{dismissalText(b.dismissal, b.status)}</td>
                <td className="big">{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{fixed(strikeRate(b.runs, b.balls), 1)}</td>
              </tr>
            ))}
            <tr>
              <td className="l">Extras</td>
              <td className="l muted">w {card.extras.wides}, nb {card.extras.noballs}, b {card.extras.byes}, lb {card.extras.legbyes}{card.extras.penalty ? `, pen ${card.extras.penalty}` : ""}</td>
              <td className="strong">{card.extras.total}</td><td colSpan={4}></td>
            </tr>
            <tr>
              <td className="l strong">Total</td>
              <td className="l muted">{card.wickets} wkts, {oversDisplay(card.legalBalls)} ov</td>
              <td className="big">{card.runs}</td><td colSpan={4}></td>
            </tr>
          </tbody>
        </table>
      </div>

      {card.fallOfWickets.length > 0 && (
        <div>
          <p className="label muted" style={{ marginBottom: 6 }}>Fall of wickets</p>
          <p className="fow">
            {card.fallOfWickets.map((f) => (
              <span key={f.wicketNumber}>
                <strong>{f.score}-{f.wicketNumber}</strong> {playerName(f.player)}, {oversDisplay(f.legalBalls)}
              </span>
            ))}
          </p>
        </div>
      )}

      <div className="table-wrap">
        <table className="data">
          <thead><tr><th className="l">Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th><th>Dots</th><th>Wd</th><th>Nb</th></tr></thead>
          <tbody>
            {card.bowlers.map((b) => (
              <tr key={b.player}>
                <td className="l strong">{playerName(b.player)}</td>
                <td>{oversDisplay(b.legalBalls)}</td><td>{b.maidens}</td><td>{b.runs}</td><td className="big">{b.wickets}</td>
                <td>{fixed(economy(b.runs, b.legalBalls))}</td><td>{b.dots}</td><td>{b.wides}</td><td>{b.noballs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
