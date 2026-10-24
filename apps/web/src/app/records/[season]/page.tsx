import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RecordsView } from "@/components/RecordsView";
import { seasonsWithMatches, seasonLabel } from "@/lib/data";

export const dynamicParams = false;

export function generateStaticParams() {
  return seasonsWithMatches().map((s) => ({ season: s.id }));
}

export async function generateMetadata({ params }: { params: Promise<{ season: string }> }): Promise<Metadata> {
  const { season } = await params;
  return { title: `Records · ${seasonLabel(season)}` };
}

export default async function SeasonRecords({ params }: { params: Promise<{ season: string }> }) {
  const { season } = await params;
  if (!seasonsWithMatches().some((s) => s.id === season)) notFound();
  return <RecordsView seasonId={season} />;
}
