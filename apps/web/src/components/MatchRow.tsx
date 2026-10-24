import Link from "next/link";
import type { Match } from "@npl/cricket-core";
import { oversDisplay } from "@npl/cricket-core";
import { matchLabel, resultLine, scored, team, winnerOf } from "@/lib/data";
import { matchDate } from "@/lib/format";

export function MatchRow({ m }: { m: Match }) {
  const { cards } = scored(m);
  const w = winnerOf(m);
  return (
    <li>
      <Link href={`/matches/${m.id}`} className="match-row">
        <div>
          <span className="label">{matchLabel(m)}</span>
          <span className="label muted" style={{ display: "block" }}>{matchDate(m.date, { weekday: true })}</span>
        </div>
        <div className="teams">
          {cards.map((c) => (
            <div key={c.battingTeam} className={`tline ${w === c.battingTeam ? "win" : ""}`}>
              <span>{team(c.battingTeam).name}</span>
              <span className="s">
                {c.runs}/{c.wickets} <span className="muted" style={{ fontWeight: 400 }}>({oversDisplay(c.legalBalls)})</span>
              </span>
            </div>
          ))}
        </div>
        <div className="res">{resultLine(m)}</div>
      </Link>
    </li>
  );
}
