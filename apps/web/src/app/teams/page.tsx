import type { Metadata } from "next";
import Link from "next/link";
import { TeamBadge } from "@/components/TeamBadge";
import { ds, teamHistory } from "@/lib/data";

export const metadata: Metadata = { title: "Teams" };

export default function TeamsPage() {
  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted">Nepal Premier League · Season 3</p>
          <h1 className="display">Teams</h1>
        </div>
      </section>
      <section className="bone section">
        <div className="wrap team-grid">
          {ds().teams.map((t) => {
            const h = teamHistory(t.id);
            const titles = h.filter((s) => s.champion).map((s) => s.season.year);
            return (
              <Link key={t.id} href={`/teams/${t.id}`} className="team-card" style={{ "--tc": t.colour ?? "var(--ink)" } as React.CSSProperties}>
                <TeamBadge team={t} size={96} />
                <span className="display team-card-name">{t.name}</span>
                <span className="label muted">
                  {h.map((s) => `${s.season.year}: ${s.won}–${s.lost}`).join(" · ")}
                  {titles.length > 0 && <strong className="champ"> · Champions {titles.join(", ")}</strong>}
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}
