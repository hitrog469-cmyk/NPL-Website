import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FixtureList } from "@/components/FixtureList";
import { MatchRow } from "@/components/MatchRow";
import { TeamBadge } from "@/components/TeamBadge";
import { Tag } from "@/components/Tag";
import { ds, matchesIn, playerName, s3Squads, STAGE_LABEL, team, teamFixtures, teamHistory, teamLeaders } from "@/lib/data";
import { matchDate } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return ds().teams.map((t) => ({ slug: t.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  return { title: team(slug).name };
}

const ROLE: Record<string, string> = {
  batter: "Batter",
  bowler: "Bowler",
  "all-rounder": "All-rounder",
  wicketkeeper: "Wicketkeeper",
  "wicketkeeper-batter": "Wicketkeeper-batter",
};

export default async function TeamPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const t = ds().teams.find((x) => x.id === slug);
  if (!t) notFound();
  const squad = s3Squads()[t.id];
  const history = teamHistory(t.id);
  const leaders = teamLeaders(t.id);
  const recent = [...matchesIn()].filter((m) => m.teams.includes(t.id)).reverse().slice(0, 5);

  return (
    <>
      <section className="ink team-hero" style={{ "--tc": t.colour ?? "var(--ink-2)" } as React.CSSProperties}>
        <div className="wrap team-hero-inner">
          <TeamBadge team={t} size={160} />
          <div>
            <p className="label muted">Nepal Premier League · Season 3</p>
            <h1 className="display team-hero-name wipe">{t.name}</h1>
            <p className="team-hero-hist label">
              {history.map((s) => (
                <span key={s.season.id}>
                  {s.season.year}: {s.won}W {s.lost}L{s.playoffs.length ? ` · ${STAGE_LABEL[s.playoffs.at(-1)!]}` : ""}{s.champion ? " · Champions" : ""}
                </span>
              ))}
            </p>
          </div>
        </div>
      </section>

      <section className="bone section">
        <div className="wrap team-layout">
          <div>
            <div className="sec-head"><h2 className="display">Squad</h2></div>
            {squad ? (
              <>
                <ul className="squad">
                  {squad.players.map((p) => (
                    <li key={p.name}>
                      <span className="squad-name">{p.name}</span>
                      <span className="label muted">
                        {p.role ? ROLE[p.role] : "Role not listed"}
                        {p.captain ? " · Captain" : ""}
                        {p.overseas ? " · Overseas" : ""}
                      </span>
                    </li>
                  ))}
                </ul>
                <p className="caption">
                  <Tag kind="admin_reported">As listed by team</Tag>
                  <span>
                    {squad.players.length} players listed on {squad.sourceUrl.replace(/^https?:\/\//, "").split("/")[0]}, {matchDate(squad.readAt)}. {squad.note}
                  </span>
                </p>
              </>
            ) : (
              <div className="empty"><p className="display">Squad to be announced</p></div>
            )}

            <div className="sec-head" style={{ marginTop: 56 }}><h2 className="display">Season 3 fixtures</h2></div>
            <FixtureList fixtures={teamFixtures(t.id)} />
          </div>

          <aside className="team-rail-side">
            <div>
              <p className="label muted">Most runs for {t.shortName}</p>
              <ol className="rank-list">
                {leaders.runs.map((l, i) => (
                  <li key={l.player}><span className="r">{i + 1}</span><span>{playerName(l.player)}</span><span className="v num">{l.value}</span></li>
                ))}
              </ol>
            </div>
            <div>
              <p className="label muted">Most wickets for {t.shortName}</p>
              <ol className="rank-list">
                {leaders.wickets.map((l, i) => (
                  <li key={l.player}><span className="r">{i + 1}</span><span>{playerName(l.player)}</span><span className="v num">{l.value}</span></li>
                ))}
              </ol>
            </div>
            <p className="caption"><Tag kind="historical_imported" /> Seasons 1–2</p>
            {t.website && <p className="caption"><a href={t.website} rel="noopener">Official team website</a></p>}
          </aside>
        </div>
      </section>

      <section className="bone section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <div className="sec-head"><h2 className="display">Recent results</h2><p className="aside"><Link href="/matches">All matches</Link></p></div>
          <ul className="match-list">{recent.map((m) => <MatchRow key={m.id} m={m} />)}</ul>
        </div>
      </section>
    </>
  );
}
