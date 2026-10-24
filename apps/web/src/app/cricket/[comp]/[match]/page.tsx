import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Tag } from "@/components/Tag";
import { competition, cricketIndex, scorecard, scoreText } from "@/lib/cricket";
import { matchDate } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return cricketIndex().flatMap((c) => (competition(c.id)?.scorecards ?? []).map((m) => ({ comp: c.id, match: m })));
}

export async function generateMetadata({ params }: { params: Promise<{ comp: string; match: string }> }): Promise<Metadata> {
  const { comp, match } = await params;
  const s = scorecard(comp, match);
  return s ? { title: `${s.teams.join(" v ")} · ${matchDate(s.date)}`, description: s.result } : {};
}

export default async function CricketScorecard({ params }: { params: Promise<{ comp: string; match: string }> }) {
  const { comp, match } = await params;
  const s = scorecard(comp, match);
  const c = competition(comp);
  if (!s || !c) notFound();

  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted"><Link href={`/cricket/${comp}`}>{c.short}</Link> · {s.season} · {matchDate(s.date, { weekday: true })}</p>
          <div className="cs-head">
            {s.innings.map((i, k) => (
              <div key={k} className={`side ${s.winner && s.winner !== i.team ? "lose" : ""}`}>
                <span className="display tname">{i.team}</span>
                <span className="display score num" style={{ fontSize: "clamp(3rem, 10vw, 6rem)" }}>{scoreText(i)}</span>
                <span className="overs label">{i.overs} ov</span>
              </div>
            ))}
          </div>
          <p className="lead" style={{ fontWeight: 700 }}>{s.result}</p>
          <p className="caption">{s.venue}{s.toss && ` · ${s.toss.winner} won the toss, chose to ${s.toss.decision}`}{s.playerOfMatch.length > 0 && ` · Player of the match: ${s.playerOfMatch.join(", ")}`}</p>
        </div>
      </section>
      <section className="bone">
        <div className="wrap">
          {s.scorecard.map((inn, k) => {
            const max = Math.max(...inn.perOver, 1);
            return (
              <div key={k} className="innings-block">
                <div className="innings-head">
                  <h2 className="display">{inn.superOver ? "Super Over · " : ""}{inn.team}</h2>
                  <span className="display tot num">{inn.runs}/{inn.wickets} <span className="muted" style={{ fontSize: "0.5em" }}>({inn.overs})</span></span>
                </div>
                {inn.perOver.length > 1 && inn.perOver.length <= 50 && (
                  <div>
                    <div className="over-strip" role="img" aria-label={inn.perOver.map((r, i) => `Over ${i + 1}: ${r}`).join("; ")}>
                      {inn.perOver.map((r, i) => <div key={i} className={`bar ${i < 6 ? "pp" : ""}`} style={{ height: `${(r / max) * 100}%` }} />)}
                    </div>
                  </div>
                )}
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th className="l">Batter</th><th className="l">Dismissal</th><th>R</th><th>B</th><th>4s</th><th>6s</th></tr></thead>
                    <tbody>
                      {inn.batters.map((b) => <tr key={b.name}><td className="l strong">{b.name}</td><td className="l muted wrap-ok">{b.out}</td><td className="big">{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td></tr>)}
                      <tr><td className="l">Extras</td><td className="l muted">w {inn.extras.wides}, nb {inn.extras.noballs}, b {inn.extras.byes}, lb {inn.extras.legbyes}</td><td className="strong">{inn.extras.total}</td><td colSpan={3} /></tr>
                    </tbody>
                  </table>
                </div>
                {inn.fow.length > 0 && <p className="fow">{inn.fow.map((f) => <span key={f}>{f}</span>)}</p>}
                <div className="table-wrap">
                  <table className="data">
                    <thead><tr><th className="l">Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th></tr></thead>
                    <tbody>{inn.bowlers.map((b) => <tr key={b.name}><td className="l strong">{b.name}</td><td>{b.overs}</td><td>{b.maidens}</td><td>{b.runs}</td><td className="big">{b.wickets}</td></tr>)}</tbody>
                  </table>
                </div>
              </div>
            );
          })}
          <p className="caption" style={{ padding: "24px 0 48px" }}>
            <Link href={`/cricket/${comp}`}>All {c.short} results</Link> <Tag kind="historical_imported" /> Cricsheet match {s.id}
          </p>
        </div>
      </section>
    </>
  );
}
