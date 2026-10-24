import Link from "next/link";
import type { Fixture } from "@npl/data";
import { TeamBadge } from "@/components/TeamBadge";
import { fixtureLabel, team } from "@/lib/data";
import { kickoff, matchDate } from "@/lib/format";

/** Fixtures grouped by Nepal-time date. */
export function FixtureList({ fixtures }: { fixtures: Fixture[] }) {
  const byDate = new Map<string, Fixture[]>();
  for (const f of fixtures) {
    const d = kickoff(f.startsAtUtc).date;
    byDate.set(d, [...(byDate.get(d) ?? []), f]);
  }
  return (
    <div className="fx-days">
      {[...byDate].map(([date, fs]) => (
        <div key={date} className="fx-day">
          <p className="label fx-date">{matchDate(date, { weekday: true, year: false })}</p>
          <ul className="fx-list">
            {fs.map((f) => {
              const k = kickoff(f.startsAtUtc);
              return (
                <li key={f.id} className="fx">
                  <span className="fx-time num">{k.time}</span>
                  <span className="fx-teams">
                    {f.teams ? (
                      f.teams.map((t, i) => (
                        <Link key={t} href={`/teams/${t}`} className="fx-team">
                          <TeamBadge team={team(t)} size={28} />
                          <span>{team(t).name}</span>
                          {i === 0 && <span className="fx-v muted" aria-hidden>v</span>}
                        </Link>
                      ))
                    ) : (
                      <span className="muted">Teams decided by the league stage</span>
                    )}
                  </span>
                  <span className="label muted fx-no">{fixtureLabel(f)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
