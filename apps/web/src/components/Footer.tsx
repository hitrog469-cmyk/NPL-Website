import Link from "next/link";
import { SITE } from "@/lib/site";
import { coverage } from "@/lib/data";
import { matchDate } from "@/lib/format";

export function Footer() {
  const c = coverage();
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
            {c.matches} NPL matches, {c.first && matchDate(c.first)} – {c.last && matchDate(c.last)}. Season 3 results are entered by
            the site editor and labelled as such.
          </p>
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
