import Link from "next/link";
import { scoreText, type MatchSummary } from "@/lib/cricket";
import { matchDate } from "@/lib/format";

/** One finished match from any competition. Links to the scorecard when we keep one. */
export function ResultRow({ m, comp, hasCard }: { m: MatchSummary; comp: string; hasCard: boolean }) {
  const body = (
    <>
      <div>
        <span className="label">{m.stage !== "league" ? m.stage.replace("-", " ") : m.season}</span>
        <span className="label muted" style={{ display: "block" }}>{matchDate(m.date, { weekday: true })}</span>
      </div>
      <div className="teams">
        {m.innings.length ? (
          m.innings.map((i, k) => (
            <div key={k} className={`tline ${m.winner === i.team ? "win" : ""}`}>
              <span>{i.team}</span>
              <span className="s">{scoreText(i)} <span className="muted" style={{ fontWeight: 400 }}>({i.overs})</span></span>
            </div>
          ))
        ) : (
          <div className="tline"><span>{m.teams.join(" v ")}</span></div>
        )}
      </div>
      <div className="res">{m.result}</div>
    </>
  );
  return <li>{hasCard ? <Link href={`/cricket/${comp}/${m.id}`} className="match-row">{body}</Link> : <div className="match-row">{body}</div>}</li>;
}
