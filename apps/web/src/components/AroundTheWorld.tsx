import Link from "next/link";
import { cricketIndex, scoreText } from "@/lib/cricket";
import { matchDate } from "@/lib/format";

/** Compact homepage strip: everything beyond the featured competition, one tap away. */
export function AroundTheWorld() {
  const comps = cricketIndex();
  return (
    <section className="ink section atw" aria-labelledby="atw-h">
      <div className="wrap">
        <div className="sec-head">
          <h2 id="atw-h" className="display">Around the world</h2>
          <p className="aside muted"><Link href="/cricket">All cricket</Link> · <Link href="/football">Football</Link></p>
        </div>
        <div className="atw-rail" role="list">
          {comps.map((c) => (
            <Link key={c.id} href={`/cricket/${c.id}`} className="atw-item" role="listitem">
              <span className="label muted">{c.short} · {c.format}</span>
              {c.latest ? (
                <>
                  {c.latest.innings.slice(0, 2).map((i, k) => (
                    <span key={k} className={`atw-line ${c.latest!.winner === i.team ? "win" : ""}`}>
                      <span>{i.team}</span>
                      <span className="num">{scoreText(i)}</span>
                    </span>
                  ))}
                  <span className="label muted">{matchDate(c.latest.date)}</span>
                </>
              ) : (
                <span className="muted">No matches yet</span>
              )}
            </Link>
          ))}
          <Link href="/football" className="atw-item atw-football" role="listitem">
            <span className="label muted">Football</span>
            <span className="atw-line"><span>Premier League · La Liga · UCL</span></span>
            <span className="label muted">Tables &amp; fixtures →</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
