import type { Metadata } from "next";
import { MatchRow } from "@/components/MatchRow";
import { Tag } from "@/components/Tag";
import { historicalSeasons, matchesIn, s3Fixtures } from "@/lib/data";

export const metadata: Metadata = { title: "Matches" };

export default function MatchesPage() {
  const fx = s3Fixtures();
  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted">Fixtures &amp; results</p>
          <h1 className="display">Matches</h1>
        </div>
      </section>

      <section className="bone section">
        <div className="wrap">
          <div className="sec-head">
            <h2 className="display">Season 3</h2>
            <p className="aside">{fx.status === "approved" ? <Tag kind="official_confirmed">Official schedule</Tag> : <Tag kind="pending">Fixture sheet pending</Tag>}</p>
          </div>
          {fx.fixtures.length === 0 ? (
            <div className="empty">
              <p className="display">Fixtures not yet published</p>
              <p className="muted" style={{ maxWidth: "60ch" }}>
                We publish the Season 3 schedule only after checking it against the official fixture sheet. All start times will be shown in Nepal time
                (Asia/Kathmandu).
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {[...historicalSeasons()].reverse().map((s) => {
        const ms = [...matchesIn(s.id)].reverse();
        return (
          <section key={s.id} className="bone section" style={{ paddingTop: 0 }}>
            <div className="wrap">
              <div className="sec-head">
                <h2 className="display">{s.label} · {s.year}</h2>
                <p className="aside muted">{ms.length} matches · <Tag kind="historical_imported" /></p>
              </div>
              <ul className="match-list">
                {ms.map((m) => <MatchRow key={m.id} m={m} />)}
              </ul>
            </div>
          </section>
        );
      })}
    </>
  );
}
