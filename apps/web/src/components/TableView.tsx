import Link from "next/link";
import { StandingsTable } from "@/components/StandingsTable";
import { Tag } from "@/components/Tag";
import { historicalSeasons, historicalTable, s3Table, seasonLabel } from "@/lib/data";

export function TableView({ seasonId }: { seasonId: string }) {
  const isS3 = seasonId === "s3";
  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted">Points table · {seasonLabel(seasonId)}</p>
          <h1 className="display">Table</h1>
        </div>
      </section>
      <section className="bone section" style={{ paddingTop: 0 }}>
        <div className="wrap">
          <nav className="tabs" aria-label="Season" style={{ paddingTop: 16 }}>
            <Link href="/table" aria-current={isS3 ? "page" : undefined}>Season 3 · 2026</Link>
            {historicalSeasons().map((s) => (
              <Link key={s.id} href={`/table/${s.id}`} aria-current={seasonId === s.id ? "page" : undefined}>
                {s.label} · {s.year}
              </Link>
            ))}
          </nav>
          {isS3 ? <S3 /> : <Historical seasonId={seasonId} />}
        </div>
      </section>
    </>
  );
}

function S3() {
  const { rows, rules, results, imported } = s3Table();
  return (
    <div style={{ display: "grid", gap: 24 }}>
      {results.length === 0 && (
        <div className="notice">
          <strong>No Season 3 results yet.</strong>
          <span className="muted">The table fills in as each result is entered and checked. Teams are listed alphabetically until then.</span>
        </div>
      )}
      <StandingsTable
        rows={rows}
        rules={rules}
        caption={
          <>
            {results.length} result{results.length === 1 ? "" : "s"}
            {imported > 0 && <> ({imported} from Cricsheet ball-by-ball, {results.length - imported} entered by the editor)</>}. <Tag kind="admin_reported" /> until
            confirmed against official playing conditions.
          </>
        }
      />
    </div>
  );
}

function Historical({ seasonId }: { seasonId: string }) {
  const { rows, rules, matches } = historicalTable(seasonId);
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div className="notice">
        <strong>Reconstructed, not the official table.</strong>
        <span className="muted">
          Computed by us from {matches} league-stage matches in the Cricsheet archive using the rules below. The official {seasonLabel(seasonId)} table may differ
          if the league used different tie or tie-break rules.
        </span>
      </div>
      <StandingsTable rows={rows} rules={rules} caption={<>League stage only. <Tag kind="historical_imported" /></>} />
    </div>
  );
}
