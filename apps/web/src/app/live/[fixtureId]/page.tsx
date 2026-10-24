import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LiveMatch, type LiveTeam } from "@/components/live/LiveMatch";
import { MatchRow } from "@/components/MatchRow";
import { Tag } from "@/components/Tag";
import { fixtureLabel, matchesIn, scorableFixtures, team, winnerOf } from "@/lib/data";
import { kickoff, matchDate } from "@/lib/format";

export const dynamicParams = false;

export function generateStaticParams() {
  return scorableFixtures().map((f) => ({ fixtureId: f.id }));
}

const find = (id: string) => scorableFixtures().find((f) => f.id === id);

export async function generateMetadata({ params }: { params: Promise<{ fixtureId: string }> }): Promise<Metadata> {
  const f = find((await params).fixtureId);
  if (!f?.teams) return {};
  if (f.id === "rehearsal") return { title: "Rehearsal", robots: { index: false, follow: false } };
  return { title: `${team(f.teams[0]).name} v ${team(f.teams[1]).name} · Live`, description: `${fixtureLabel(f)}, Season 3. Live ball-by-ball score.` };
}

export default async function LivePage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const f = find((await params).fixtureId);
  if (!f?.teams) notFound();
  const k = kickoff(f.startsAtUtc);
  const teams = f.teams.map((id): LiveTeam => {
    const t = team(id);
    return { id, name: t.name, shortName: t.shortName, logo: t.logo ?? null, colour: t.colour };
  }) as [LiveTeam, LiveTeam];
  const [a, b] = f.teams;
  const meetings = [...matchesIn()].filter((m) => m.teams.includes(a) && m.teams.includes(b)).reverse();
  const wins = (id: string) => meetings.filter((m) => winnerOf(m) === id).length;
  const preview = (
    <div>
      <div className="sec-head">
        <h2 className="display">Head to head</h2>
        <p className="aside muted">Seasons 1–2 · <Tag kind="historical_imported" /></p>
      </div>
      {meetings.length ? (
        <>
          <p className="h2h">
            <span><strong className="display num">{wins(a)}</strong> {team(a).name}</span>
            <span><strong className="display num">{wins(b)}</strong> {team(b).name}</span>
          </p>
          <ul className="match-list">{meetings.map((m) => <MatchRow key={m.id} m={m} />)}</ul>
        </>
      ) : (
        <p className="muted">These teams have not met in the archive.</p>
      )}
    </div>
  );
  return (
    <LiveMatch
      preview={preview}
      fixtureId={f.id}
      startsAtUtc={f.startsAtUtc}
      kickoffText={`${matchDate(k.date, { weekday: true, year: false })} · ${k.time}`}
      label={f.id === "rehearsal" ? "REHEARSAL · demo data, not a real match" : `Season 3 · ${fixtureLabel(f)} · Kirtipur`}
      teams={teams}
    />
  );
}
