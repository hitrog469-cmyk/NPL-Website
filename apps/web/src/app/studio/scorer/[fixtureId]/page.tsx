import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fixtureLabel, REHEARSAL, s3Fixtures, s3Squads, team } from "@/lib/data";
import { Scorer, type ScorerTeam } from "./Scorer";

export const metadata: Metadata = { title: "Scorer", robots: { index: false, follow: false } };
export const dynamicParams = false;

export function generateStaticParams() {
  return [...s3Fixtures().fixtures, REHEARSAL].map((f) => ({ fixtureId: f.id }));
}

export default async function ScorerPage({ params }: { params: Promise<{ fixtureId: string }> }) {
  const { fixtureId } = await params;
  const f = [...s3Fixtures().fixtures, REHEARSAL].find((x) => x.id === fixtureId);
  if (!f) notFound();
  if (!f.teams) return <div className="sc-box">Teams for this playoff are not decided yet.</div>;
  const squads = s3Squads();
  const teams = f.teams.map((id): ScorerTeam => {
    const t = team(id);
    return { id, name: t.name, shortName: t.shortName, squad: squads[id]?.players.map((p) => p.name) ?? [] };
  }) as [ScorerTeam, ScorerTeam];
  return <Scorer fixtureId={f.id} label={`${fixtureLabel(f)} · ${teams[0].shortName} v ${teams[1].shortName}`} teams={teams} />;
}
