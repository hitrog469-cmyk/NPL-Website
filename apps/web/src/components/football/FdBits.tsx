import type { FdMatch, FdRow, FdTeam } from "@/lib/football";
import { isLive } from "@/lib/football";
import { kickoff, matchDate } from "@/lib/format";

export function Crest({ team, size = 22 }: { team: FdTeam; size?: number }) {
  // eslint-disable-next-line @next/next/no-img-element
  return team.crest ? <img className="crest" src={team.crest} alt="" width={size} height={size} loading="lazy" decoding="async" /> : null;
}

export function FdCredit() {
  return (
    <p className="caption">
      Football data provided by <a href="https://www.football-data.org">football-data.org</a>. Times in Nepal time. Scores on the free feed can lag the real match by a few minutes.
    </p>
  );
}

export function Unavailable({ what }: { what: string }) {
  return (
    <div className="empty">
      <p className="display" style={{ fontSize: "1.75rem" }}>{what} unavailable right now</p>
      <p className="muted">The football feed did not respond. This page refreshes itself; nothing shown here is placeholder data.</p>
    </div>
  );
}

export function LeagueTable({ rows, compact = false }: { rows: FdRow[]; compact?: boolean }) {
  return (
    <div className="table-wrap">
      <table className="data">
        <thead>
          <tr>
            <th className="l">#</th><th className="l">Team</th><th>P</th>
            {!compact && <><th>W</th><th>D</th><th>L</th><th>GF</th><th>GA</th></>}
            <th>GD</th><th>Pts</th>{!compact && <th className="l">Form</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.team.id}>
              <td className="l rank">{r.position}</td>
              <td className="l strong"><span className="crest-name"><Crest team={r.team} />{compact ? r.team.shortName : r.team.name}</span></td>
              <td>{r.playedGames}</td>
              {!compact && <><td>{r.won}</td><td>{r.draw}</td><td>{r.lost}</td><td>{r.goalsFor}</td><td>{r.goalsAgainst}</td></>}
              <td>{r.goalDifference > 0 ? `+${r.goalDifference}` : r.goalDifference}</td>
              <td className="big">{r.points}</td>
              {!compact && <td className="l"><Form form={r.form} /></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Form({ form }: { form: string | null }) {
  if (!form) return <span className="muted">–</span>;
  return (
    <span className="form">
      {form.split(",").slice(-5).map((f, i) => <span key={i} className={`form-${f}`}>{f}</span>)}
    </span>
  );
}

export function MatchLine({ m }: { m: FdMatch }) {
  const k = kickoff(m.utcDate);
  const done = m.status === "FINISHED" || m.status === "AWARDED";
  const live = isLive(m);
  const s = m.score.fullTime;
  const win = (side: "HOME_TEAM" | "AWAY_TEAM") => (done && m.score.winner === side ? "win" : "");
  return (
    <li className="fd-match">
      <span className="fd-when label">
        {live ? <span className="lv-status lv-status--live">LIVE</span> : done ? matchDate(k.date, { year: false }) : <>{matchDate(k.date, { weekday: true, year: false })}<br />{k.time}</>}
      </span>
      <span className={`fd-team ${win("HOME_TEAM")}`}><Crest team={m.homeTeam} /> {m.homeTeam.shortName}</span>
      <span className="fd-score num">{done || live ? `${s.home ?? 0} – ${s.away ?? 0}` : m.status === "POSTPONED" ? "PP" : "v"}</span>
      <span className={`fd-team fd-away ${win("AWAY_TEAM")}`}>{m.awayTeam.shortName} <Crest team={m.awayTeam} /></span>
    </li>
  );
}
