import Link from "next/link";
import { NavLinks, NplSubnav } from "./NavLinks";
import { SITE } from "@/lib/site";
import { daysBetween, matchDate, todayKathmandu } from "@/lib/format";
import { s3Fixtures, s3Season, team } from "@/lib/data";
import { LiveNow } from "./live/LiveNow";

export function Masthead() {
  const today = todayKathmandu();
  const s3 = s3Season();
  const start = s3.window?.start;
  const days = start ? daysBetween(today, start) : null;

  return (
    <header>
      <div className="topbar">
        <div className="wrap">
          <span className="label now">
            <time dateTime={today}>{matchDate(today, { weekday: true })}</time> · Kathmandu
          </span>
          <span className="label">
            {days !== null && days > 0 ? `NPL 2026 starts in ${days} day${days === 1 ? "" : "s"}` : "NPL 2026"}
            <span className="hide-sm"> · {SITE.independence.split(";")[0]}</span>
          </span>
        </div>
      </div>
      <div className="masthead">
        <div className="wrap">
          <Link href="/" className="wordmark">
            <span className="display">{SITE.name}</span>
            <span className="label tag-sm">Cricket · Football</span>
          </Link>
          <NavLinks />
        </div>
      </div>
      <NplSubnav />
      <LiveNow labels={Object.fromEntries(s3Fixtures().fixtures.filter((f) => f.teams).map((f) => [f.id, `${team(f.teams![0]).shortName} v ${team(f.teams![1]).shortName}`]))} />
    </header>
  );
}
