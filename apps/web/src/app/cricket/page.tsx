import type { Metadata } from "next";
import Link from "next/link";
import { Tag } from "@/components/Tag";
import { cricketIndex, scoreText, type CompIndexEntry } from "@/lib/cricket";
import { coverage } from "@/lib/data";
import { matchDate } from "@/lib/format";

export const metadata: Metadata = { title: "Cricket", description: "Results, records and teams across the IPL, T20 Internationals, BBL, PSL, CPL, SA20, ILT20, ODIs and Tests." };

export default function CricketIndex() {
  const comps = cricketIndex();
  const npl = coverage();
  const total = comps.reduce((s, c) => s + c.coverage.matches, 0) + npl.matches;
  const group = (k: CompIndexEntry["kind"]) => comps.filter((c) => c.kind === k);

  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted">{total.toLocaleString("en-US")} matches, ball by ball</p>
          <h1 className="display">Cricket</h1>
          <p className="lead muted">Every competition below is built from the same ball-by-ball engine as our NPL pages: results, records, teams and scorecards.</p>
        </div>
      </section>

      <section className="bone section">
        <div className="wrap">
          <Link href="/matches" className="comp-feature">
            <span className="label">Featured · live ball-by-ball</span>
            <span className="display">Nepal Premier League</span>
            <span className="muted">Season 3 schedule, live scores, predictions, table · {npl.matches} past matches</span>
          </Link>

          {(["league", "international"] as const).map((k) => (
            <div key={k} style={{ marginTop: 48 }}>
              <div className="sec-head"><h2 className="display">{k === "league" ? "T20 leagues" : "International"}</h2></div>
              <div className="comp-grid">
                {group(k).map((c) => (
                  <Link key={c.id} href={`/cricket/${c.id}`} className="comp-card">
                    <span className="comp-short display">{c.short}</span>
                    <span className="comp-name">{c.name}</span>
                    <span className="label muted">{c.coverage.matches.toLocaleString("en-US")} matches · {c.coverage.first?.slice(0, 4)}–{c.coverage.last?.slice(0, 4)}</span>
                    {c.latest && (
                      <span className="comp-latest">
                        <span className="label muted">Latest · {matchDate(c.latest.date)}</span>
                        <span>{c.latest.innings.map((i) => `${i.team} ${scoreText(i)}`).join(" · ")}</span>
                        <span className="muted">{c.latest.result}</span>
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <p className="caption" style={{ marginTop: 24 }}>
            <Tag kind="historical_imported" /> From Cricsheet (ODC-BY), updated automatically twice a day. New matches usually appear a few days after they are played.
            Live scores are NPL only.
          </p>
        </div>
      </section>
    </>
  );
}
