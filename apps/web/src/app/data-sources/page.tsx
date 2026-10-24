import type { Metadata } from "next";
import { Tag } from "@/components/Tag";
import { coverage, ds, QUALIFIERS } from "@/lib/data";
import { matchDate } from "@/lib/format";
import { SITE } from "@/lib/site";

export const metadata: Metadata = { title: "Data sources & methodology" };

export default function DataSources() {
  const c = coverage();
  const m = ds().manifest;
  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted">Sources, definitions, limits</p>
          <h1 className="display">Data</h1>
          <p className="lead muted">{SITE.independence}</p>
        </div>
      </section>
      <section className="bone section">
        <div className="wrap"><div className="prose">
          <h2>Where the numbers come from</h2>
          <ul>
            <li>
              <Tag kind="historical_imported" /> Seasons 1 and 2: ball-by-ball files from <a href="https://cricsheet.org">Cricsheet</a> ({c.matches} matches,{" "}
              {c.first && matchDate(c.first)} – {c.last && matchDate(c.last)}), licensed under the{" "}
              <a href="https://opendatacommons.org/licenses/by/1-0/">Open Data Commons Attribution License v1.0</a>. Parser version {m.parserVersion}. Each match page
              shows its Cricsheet id, data revision and file checksum.
            </li>
            <li>
              <Tag kind="admin_reported" /> Season 3 fixtures and results: entered by the site editor from official sources, then marked{" "}
              <Tag kind="official_confirmed" /> once confirmed.
            </li>
            <li>We do not scrape other websites, and we do not show win probabilities until a model has been validated and published here.</li>
          </ul>

          <h2>How we count</h2>
          <ul>
            <li>Overs are shown from legal-ball counts; 17.3 means 17 overs and 3 legal balls, never a decimal.</li>
            <li>Wides and no-balls are not legal balls. A wide is not a ball faced; a no-ball is.</li>
            <li>Bowler runs include wides and no-balls, not byes, leg-byes or penalty runs.</li>
            <li>Run outs and retirements are not credited to the bowler. Retired hurt is not out.</li>
            <li>A four is counted only when the ball reached the boundary; four runs run between the wickets is not a four.</li>
            <li>Super Overs are shown on the match page but excluded from player and team records.</li>
            <li>Strike-rate table qualifies at {QUALIFIERS.strikeRateMinBalls} balls faced; economy table at {QUALIFIERS.economyMinBalls / 6} overs.</li>
            <li>Lowest totals include only completed innings: all out, or batted the full allotted overs.</li>
            <li>Players are identified by Cricsheet registry id, never by name. Names appear as Cricsheet prints them (often initials).</li>
          </ul>

          <h2>Known limits</h2>
          <ul>
            <li>Season 1 and 2 points tables are reconstructed by us and may differ from the official tables.</li>
            <li>The Season 3 table uses common T20 rules until NPL Season 3 playing conditions are entered; it is labelled provisional until then.</li>
            <li>Team spellings (e.g. Gorkhas / Gurkhas, Sudurpaschim / Sudur Paschim) are merged into one team and await official confirmation.</li>
            <li>Every number is checked automatically: batter runs plus extras must equal the total, bowler runs plus byes, leg-byes and penalties must equal the total, and our totals must match Cricsheet&rsquo;s.</li>
          </ul>
        </div></div>
      </section>
    </>
  );
}
