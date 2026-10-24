import Link from "next/link";
import { SITE } from "@/lib/site";
import { coverage } from "@/lib/data";
import { cricketIndex } from "@/lib/cricket";
import { matchDate } from "@/lib/format";

export function Footer() {
  const c = coverage();
  const comps = cricketIndex();
  const others = comps.reduce((s, x) => s + x.coverage.matches, 0);
  return (
    <footer className="footer">
      <div className="wrap grid">
        <div>
          <p className="display">{SITE.name}</p>
          <p style={{ marginTop: 8 }}>{SITE.independence}</p>
        </div>
        <div>
          <p className="label" style={{ marginBottom: 6 }}>Data</p>
          <p>
            Historical ball-by-ball data from <a href="https://cricsheet.org">Cricsheet</a>, used under the{" "}
            <a href="https://opendatacommons.org/licenses/by/1-0/">Open Data Commons Attribution License</a>.{" "}
            {(c.matches + others).toLocaleString("en-US")} matches across {comps.length + 1} competitions, including {c.matches} NPL matches from{" "}
            {c.first && matchDate(c.first)}. NPL 2026 live scores and results are entered by the site editor and labelled as such.
          </p>
          <p style={{ marginTop: 8 }}>Team names and logos are trademarks of their franchises, shown only to identify the teams.</p>
        </div>
        <div>
          <p className="label" style={{ marginBottom: 6 }}>About the numbers</p>
          <p>
            <Link href="/data-sources">Sources, definitions and limits</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
