import { existsSync } from "node:fs";
import path from "node:path";
import Link from "next/link";
import type { Fixture } from "@npl/data";
import { TeamBadge } from "@/components/TeamBadge";
import { Tag } from "@/components/Tag";
import { fixtureLabel, team, teamHistory } from "@/lib/data";
import { daysBetween, kickoff, matchDate, todayKathmandu } from "@/lib/format";

/** Optional hero illustration: drop public/hero/featured.(webp|jpg|png) and it appears behind the board. */
function heroImage(): string | null {
  for (const ext of ["webp", "jpg", "png"]) if (existsSync(path.join(process.cwd(), "public", "hero", `featured.${ext}`))) return `/hero/featured.${ext}`;
  return null;
}

/** The homepage confrontation: next fixture, both teams at full volume. */
export function NextMatchBoard({ fixture }: { fixture: Fixture }) {
  const k = kickoff(fixture.startsAtUtc);
  const days = daysBetween(todayKathmandu(), k.date);
  const when = days <= 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days} days`;
  const [a, b] = fixture.teams ?? [null, null];
  const hero = heroImage();

  return (
    <section className="ink nm" aria-labelledby="nm-title" style={a && b ? ({ "--a": team(a).colour, "--b": team(b).colour } as React.CSSProperties) : undefined}>
      {hero && <div className="nm-hero" style={{ backgroundImage: `url(${hero})` }} aria-hidden />}
      <div className="nm-bands" aria-hidden><span /><span /></div>
      <div className="wrap nm-inner">
        <div className="nm-top">
          <p className="label">
            <span className="nm-when">{when}</span> · NPL 2026 · {fixtureLabel(fixture)} · Kirtipur
          </p>
          <span style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{hero && <span className="tag">Illustration</span>}<Tag kind="official_confirmed">Schedule</Tag></span>
        </div>
        <h1 id="nm-title" className="sr-only">
          Next match: {a ? team(a).name : "TBA"} v {b ? team(b).name : "TBA"}
        </h1>
        <div className="nm-grid">
          {[a, b].map((t, i) =>
            t ? (
              <Link key={t} href={`/teams/${t}`} className={`nm-side ${i ? "nm-b" : ""}`}>
                <TeamBadge team={team(t)} size={120} />
                <span className="display nm-name wipe">{team(t).name}</span>
                <Form teamId={t} />
              </Link>
            ) : (
              <div key={i} className="nm-side"><span className="display nm-name">TBA</span></div>
            ),
          )}
          <div className="nm-centre">
            <span className="display nm-time num">{k.time}</span>
            <span className="label">{matchDate(k.date, { weekday: true, year: false })} · Nepal time</span>
            {fixture.teams && (
              <Link href={`/live/${fixture.id}`} className="nm-cta">Predict &amp; follow live →</Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Form({ teamId }: { teamId: string }) {
  const h = teamHistory(teamId);
  return (
    <span className="label nm-form">
      {h.map((s) => `${s.season.label.replace("Season ", "S")}: ${s.won}–${s.lost}${s.champion ? " · Champions" : ""}`).join("  ·  ")}
    </span>
  );
}
