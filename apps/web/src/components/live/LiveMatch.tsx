"use client";

import { useEffect, useMemo, useState } from "react";
import { ballToken, economy, isDismissal, isLegal, oversDisplay, strikeRate, type Delivery, type InningsScorecard, type LiveInningsState } from "@npl/cricket-core";
import { useLiveMatch, useMatchView, type Connection, type LiveMatchRow } from "@/lib/live";
import { WagonWheel } from "./WagonWheel";
import { Prediction } from "./Prediction";

export interface LiveTeam {
  id: string;
  name: string;
  shortName: string;
  logo: string | null;
  colour: string | null;
}

const STATUS: Record<string, string> = {
  scheduled: "Starts soon",
  toss: "Toss",
  live: "Live · manually scored",
  innings_break: "Innings break",
  delayed: "Delayed",
  completed: "Result",
  abandoned: "Abandoned",
  no_result: "No result",
};

export function LiveMatch({ fixtureId, startsAtUtc, kickoffText, label, teams, preview }: { fixtureId: string; startsAtUtc: string; kickoffText: string; label: string; teams: [LiveTeam, LiveTeam]; preview?: React.ReactNode }) {
  const { events, match, conn, lastUpdate } = useLiveMatch(fixtureId);
  const view = useMatchView(events, match?.setup);
  const t = (id?: string | null) => teams.find((x) => x.id === id);
  const started = !!match?.setup?.battingFirst;
  const status = match?.status ?? "scheduled";

  return (
    <>
      <section className="ink lv-hero" style={{ "--a": teams[0].colour, "--b": teams[1].colour } as React.CSSProperties}>
        <div className="nm-bands" aria-hidden><span /><span /></div>
        <div className="wrap lv-inner">
          <div className="nm-top">
            <p className="label">
              <span className={`lv-status lv-status--${status}`}>{STATUS[status] ?? status}</span> · {label}
            </p>
            <Freshness conn={conn} lastUpdate={lastUpdate} live={status === "live"} />
          </div>

          {!started ? (
            <div className="lv-pre">
              {teams.map((x) => <TeamLine key={x.id} team={x} />)}
              <p className="display lv-kick num">{kickoffText}</p>
              <p className="label muted">Ball-by-ball scoring starts at the toss. This page updates by itself, no refresh needed.</p>
            </div>
          ) : (
            <Board view={view} t={t} match={match!} />
          )}
        </div>
      </section>

      <section className="bone section lv-body">
        <div className="wrap lv-grid">
          <div className="lv-main">
            {!started && preview}
            {started && (() => {
              // Between innings, keep showing the innings that just finished.
              const s = view.current?.deliveries.length ? view.current : view.first;
              return s && <Now state={s} />;
            })()}
            {started && <Commentary view={view} />}
            {started && view.first && <Card title={`${t(view.first.innings.battingTeam)?.name} innings`} state={view.first} />}
            {started && view.second && <Card title={`${t(view.second.innings.battingTeam)?.name} innings`} state={view.second} />}
          </div>
          <aside className="lv-side">
            <Prediction fixtureId={fixtureId} startsAtUtc={startsAtUtc} teams={teams} result={match?.result?.winner ?? null} />
            {started && <Wagon view={view} />}
          </aside>
        </div>
      </section>
    </>
  );
}

function Freshness({ conn, lastUpdate, live }: { conn: Connection; lastUpdate: Date | null; live: boolean }) {
  const [, tick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 5000);
    return () => clearInterval(i);
  }, []);
  if (conn === "unconfigured") return null;
  if (conn === "offline") return <span className="tag tag--prov">Update pending · reconnecting</span>;
  if (conn === "connecting") return <span className="tag tag--pending">Connecting</span>;
  const s = lastUpdate ? Math.round((Date.now() - lastUpdate.getTime()) / 1000) : null;
  return <span className="tag">{live ? "● " : ""}Updated {s === null ? "—" : s < 10 ? "just now" : s < 60 ? `${s}s ago` : `${Math.round(s / 60)}m ago`}</span>;
}

function TeamLine({ team }: { team: LiveTeam }) {
  return (
    <div className="lv-team">
      {team.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="badge" src={team.logo} alt="" width={56} height={56} />
      )}
      <span className="display">{team.name}</span>
    </div>
  );
}

function Board({ view, t, match }: { view: ReturnType<typeof useMatchView>; t: (id?: string | null) => LiveTeam | undefined; match: LiveMatchRow }) {
  const cur = view.current;
  const inns = [view.first, view.second].filter(Boolean) as LiveInningsState[];
  const toss = match.setup.toss;
  const c = cur?.card;
  const crr = c && c.legalBalls ? (c.runs * 6) / c.legalBalls : null;
  const ballsLeft = c ? c.oversLimit * 6 - c.legalBalls : 0;
  const need = view.target !== null && view.currentNo === 2 && c ? view.target - c.runs : null;

  return (
    <div className="lv-board">
      {inns.map((s, i) => {
        const team = t(s.innings.battingTeam);
        const active = s === cur && match.status !== "completed";
        return (
          <div key={i} className={`lv-inn ${active ? "on" : ""}`}>
            <span className="lv-tn">
              {team?.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img className="badge" src={team.logo} alt="" width={40} height={40} />
              )}
              <span className="display">{team?.name}</span>
            </span>
            <span className="display lv-runs num">
              {s.card.runs}/{s.card.wickets}
            </span>
            <span className="label muted">{oversDisplay(s.card.legalBalls)} ov{s.card.allOut ? " · all out" : ""}</span>
          </div>
        );
      })}
      <div className="lv-eq label">
        {match.status === "completed" && match.result?.text ? (
          <strong className="lv-result">{match.result.text}</strong>
        ) : match.status === "innings_break" && view.target !== null && view.first ? (
          <>Innings break · <strong>{t(view.first.innings.bowlingTeam)?.name}</strong> need <strong>{view.target}</strong> to win from {view.first.innings.oversLimit} overs</>
        ) : need !== null && need > 0 ? (
          <>Need <strong>{need}</strong> from <strong>{ballsLeft}</strong> balls · RRR {((need * 6) / Math.max(1, ballsLeft)).toFixed(2)} · CRR {crr?.toFixed(2) ?? "–"}</>
        ) : c ? (
          <>CRR {crr?.toFixed(2) ?? "–"}{crr !== null && view.currentNo === 1 && <> · At this rate: {Math.round(crr * c.oversLimit)}</>}</>
        ) : null}
        {toss && <span className="muted"> · {t(toss.winner)?.name} won the toss, chose to {toss.decision}</span>}
      </div>
    </div>
  );
}

function Now({ state }: { state: LiveInningsState }) {
  const bat = (p: string | null) => state.card.batters.find((b) => b.player === p);
  const bowl = state.card.bowlers.find((b) => b.player === (state.bowler ?? state.lastBowler));
  const last12 = state.innings.deliveries.slice(-12);
  return (
    <div className="lv-now">
      <div className="lv-over">
        <p className="label muted">Last 12 balls</p>
        <div className="sc-over">{last12.map((d, i) => <span key={i} className={`tok tok-${tok(ballToken(d))}`}>{ballToken(d)}</span>)}</div>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th className="l">Batter</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
          <tbody>
            {[state.striker, state.nonStriker].map((p, i) => {
              const b = bat(p);
              return p ? (
                <tr key={p}>
                  <td className="l strong">{p}{i === 0 ? " *" : ""}</td>
                  <td className="big">{b?.runs ?? 0}</td><td>{b?.balls ?? 0}</td><td>{b?.fours ?? 0}</td><td>{b?.sixes ?? 0}</td>
                  <td>{b ? strikeRate(b.runs, b.balls)?.toFixed(1) ?? "–" : "–"}</td>
                </tr>
              ) : null;
            })}
          </tbody>
          {bowl && (
            <tbody>
              <tr><th className="l">Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th></tr>
              <tr>
                <td className="l strong">{bowl.player}</td><td>{oversDisplay(bowl.legalBalls)}</td><td>{bowl.maidens}</td><td>{bowl.runs}</td>
                <td className="big">{bowl.wickets}</td><td>{economy(bowl.runs, bowl.legalBalls)?.toFixed(2) ?? "–"}</td>
              </tr>
            </tbody>
          )}
        </table>
      </div>
      <p className="caption">Partnership {state.partnership.runs} ({state.partnership.balls})</p>
    </div>
  );
}

const tok = (t: string) => (t.startsWith("W") ? "w" : t === "4" || t === "6" ? "b" : /wd|nb|lb|b/.test(t) ? "x" : "n");

/** Factual captions built from the delivery data only. */
function caption(d: Delivery): string {
  const out = d.wickets.find((w) => isDismissal(w.kind));
  const parts: string[] = [];
  if (d.extras.wides) parts.push(d.extras.wides > 1 ? `wide, ${d.extras.wides} runs` : "wide");
  if (d.extras.noballs) parts.push("no-ball");
  if (d.extras.byes) parts.push(`${d.extras.byes} bye${d.extras.byes > 1 ? "s" : ""}`);
  if (d.extras.legbyes) parts.push(`${d.extras.legbyes} leg-bye${d.extras.legbyes > 1 ? "s" : ""}`);
  if (d.extras.penalty) parts.push(`${d.extras.penalty} penalty runs`);
  if (d.isBoundary && d.runsBat === 4) parts.push("FOUR");
  else if (d.isBoundary && d.runsBat === 6) parts.push("SIX");
  else if (d.runsBat) parts.push(`${d.runsBat} run${d.runsBat > 1 ? "s" : ""}`);
  if (!parts.length) parts.push("no run");
  let s = parts.join(", ");
  if (out) s += ` · OUT: ${out.playerOut}, ${out.kind}${out.fielders.length ? ` (${out.fielders.join("/")})` : ""}`;
  return s;
}

function Commentary({ view }: { view: ReturnType<typeof useMatchView> }) {
  const rows = useMemo(() => {
    const all: { inn: number; label: string; d: Delivery; text: string }[] = [];
    for (const [i, s] of [view.first, view.second].entries()) {
      if (!s) continue;
      let legal = 0;
      for (const d of s.innings.deliveries) {
        const n = legal + (isLegal(d) ? 1 : 0);
        const ov = Math.floor((isLegal(d) ? n - 1 : legal) / 6);
        const bl = isLegal(d) ? ((n - 1) % 6) + 1 : (legal % 6) + 1;
        all.push({ inn: i + 1, label: `${ov}.${bl}`, d, text: `${d.bowler} to ${d.batter}: ${caption(d)}` });
        legal = n;
      }
    }
    return all.reverse().slice(0, 60);
  }, [view]);
  if (!rows.length) return null;
  return (
    <div className="lv-comm">
      <h2 className="display">Ball by ball</h2>
      <ol>
        {rows.map((r, i) => (
          <li key={i} className={`lv-ball lv-ball--${tok(ballToken(r.d))}`}>
            <span className="num lv-ov">{r.label}</span>
            <span className={`tok tok-${tok(ballToken(r.d))}`}>{ballToken(r.d)}</span>
            <span>{r.text}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function Card({ title, state }: { title: string; state: LiveInningsState }) {
  const c: InningsScorecard = state.card;
  const max = Math.max(...c.overs.map((o) => o.runs), 1);
  return (
    <div className="innings-block">
      <div className="innings-head">
        <h2 className="display">{title}</h2>
        <span className="display tot num">{c.runs}/{c.wickets} <span className="muted" style={{ fontSize: "0.5em" }}>({oversDisplay(c.legalBalls)})</span></span>
      </div>
      {c.overs.length > 0 && (
        <div>
          <div className="over-strip" role="img" aria-label={c.overs.map((o) => `Over ${o.over + 1}: ${o.runs}`).join("; ")}>
            {c.overs.map((o) => (
              <div key={o.over} className={`bar ${o.over < 6 ? "pp" : ""}`} style={{ height: `${(o.runs / max) * 100}%` }}>
                {o.wickets > 0 && <span className="w" aria-hidden />}
              </div>
            ))}
          </div>
          <div className="over-axis" aria-hidden>{c.overs.map((o) => <span key={o.over}>{o.over + 1}</span>)}</div>
        </div>
      )}
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th className="l">Batter</th><th className="l">Status</th><th>R</th><th>B</th><th>4s</th><th>6s</th><th>SR</th></tr></thead>
          <tbody>
            {c.batters.map((b) => (
              <tr key={b.player}>
                <td className="l strong">{b.player}</td>
                <td className="l muted wrap-ok">{b.status === "out" && b.dismissal ? `${b.dismissal.kind}${b.dismissal.bowler ? ` b ${b.dismissal.bowler}` : ""}` : b.status}</td>
                <td className="big">{b.runs}</td><td>{b.balls}</td><td>{b.fours}</td><td>{b.sixes}</td><td>{strikeRate(b.runs, b.balls)?.toFixed(1) ?? "–"}</td>
              </tr>
            ))}
            <tr><td className="l">Extras</td><td className="l muted">w {c.extras.wides}, nb {c.extras.noballs}, b {c.extras.byes}, lb {c.extras.legbyes}</td><td className="strong">{c.extras.total}</td><td colSpan={4} /></tr>
          </tbody>
        </table>
      </div>
      {c.fallOfWickets.length > 0 && (
        <p className="fow">{c.fallOfWickets.map((f) => <span key={f.wicketNumber}><strong>{f.score}-{f.wicketNumber}</strong> {f.player}, {oversDisplay(f.legalBalls)}</span>)}</p>
      )}
      <div className="table-wrap">
        <table className="data">
          <thead><tr><th className="l">Bowler</th><th>O</th><th>M</th><th>R</th><th>W</th><th>Econ</th><th>Dots</th></tr></thead>
          <tbody>
            {c.bowlers.map((b) => (
              <tr key={b.player}><td className="l strong">{b.player}</td><td>{oversDisplay(b.legalBalls)}</td><td>{b.maidens}</td><td>{b.runs}</td><td className="big">{b.wickets}</td><td>{economy(b.runs, b.legalBalls)?.toFixed(2) ?? "–"}</td><td>{b.dots}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Wagon({ view }: { view: ReturnType<typeof useMatchView> }) {
  const all = [view.first, view.second].filter(Boolean) as LiveInningsState[];
  const batters = [...new Set(all.flatMap((s) => s.card.batters.map((b) => b.player)))];
  const [who, setWho] = useState<string>("all");
  const shots = all.flatMap((s) => s.shots).filter((s) => who === "all" || s.delivery.batter === who);
  const scoring = all.flatMap((s) => s.innings.deliveries).filter((d) => d.runsBat > 0 && (who === "all" || d.batter === who)).length;
  return (
    <div className="lv-ww">
      <h2 className="display">Wagon wheel</h2>
      <select className="sc-input" value={who} onChange={(e) => setWho(e.target.value)} aria-label="Batter">
        <option value="all">All batters</option>
        {batters.map((b) => <option key={b} value={b}>{b}</option>)}
      </select>
      <WagonWheel shots={shots} scoringShots={scoring} label={`Wagon wheel for ${who === "all" ? "all batters" : who}`} />
    </div>
  );
}
