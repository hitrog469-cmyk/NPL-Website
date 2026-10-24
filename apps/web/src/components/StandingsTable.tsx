import type { StandingRow, StandingsRules } from "@npl/cricket-core";
import { Tag } from "@/components/Tag";
import { team } from "@/lib/data";
import { signed } from "@/lib/format";

export function StandingsTable({ rows, rules, cutoff = 4, caption }: { rows: StandingRow[]; rules: StandingsRules; cutoff?: number; caption: React.ReactNode }) {
  return (
    <>
      <div className="table-wrap">
        <table className="data">
          <caption className="sr-only">Points table</caption>
          <thead>
            <tr>
              <th className="l">#</th><th className="l">Team</th><th>P</th><th>W</th><th>L</th><th>T</th><th>NR</th><th>NRR</th><th>Pts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.team} className={i === cutoff - 1 ? "cut" : ""}>
                <td className="l rank">{i + 1}</td>
                <td className="l strong">{team(r.team).name}</td>
                <td>{r.played}</td><td>{r.won}</td><td>{r.lost}</td><td>{r.tied}</td><td>{r.noResult}</td>
                <td>{signed(r.nrr)}</td>
                <td className="big">{r.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="caption">
        {rules.source === "assumed" && <Tag kind="assumed" />}
        <span>{caption}</span>
      </div>
      <p className="caption">
        Points: win {rules.pointsWin}, tie {rules.pointsTie}, no result {rules.pointsNoResult}
        {rules.superOverDecidesTie ? "; a Super Over decides tied matches" : ""}. NRR = runs scored per over − runs conceded per over;
        a side bowled out is charged its full overs. Sorted by points, then NRR. {rules.source === "assumed" && "Not yet confirmed against official NPL playing conditions."} Line marks the top {cutoff}.
      </p>
    </>
  );
}
