import type { Metadata } from "next";
import Link from "next/link";
import { fixtureLabel, s3Fixtures, team } from "@/lib/data";
import { kickoff, matchDate } from "@/lib/format";

export const metadata: Metadata = { title: "Scorer", robots: { index: false, follow: false } };

export default function ScorerIndex() {
  return (
    <section className="bone section">
      <div className="wrap">
        <p className="label muted">Studio · private</p>
        <h1 className="display" style={{ fontSize: "3rem", marginBottom: 24 }}>Scorer</h1>
        <Link href="/studio/scorer/rehearsal" className="sc-btn sc-primary" style={{ display: "inline-block", marginBottom: 24, textDecoration: "none" }}>
          Practise: rehearsal match →
        </Link>
        <ul className="match-list">
          {s3Fixtures().fixtures.map((f) => {
            const k = kickoff(f.startsAtUtc);
            return (
              <li key={f.id}>
                <Link href={`/studio/scorer/${f.id}`} className="match-row">
                  <span className="label">{fixtureLabel(f)} · {matchDate(k.date, { weekday: true, year: false })} {k.time}</span>
                  <span className="strong">{f.teams ? `${team(f.teams[0]).name} v ${team(f.teams[1]).name}` : "TBA"}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
