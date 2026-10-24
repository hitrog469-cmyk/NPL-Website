import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { SITE } from "@/lib/site";
import { daysBetween, matchDate, todayKathmandu } from "@/lib/format";
import { s3Season } from "@/lib/data";

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
            {days !== null && days > 0 ? `Season 3 starts in ${days} day${days === 1 ? "" : "s"}` : "Season 3"}
            <span className="hide-sm"> · {SITE.independence.split(";")[0]}</span>
          </span>
        </div>
      </div>
      <div className="masthead">
        <div className="wrap">
          <Link href="/" className="wordmark" aria-label={`${SITE.name} home`}>
            <span className="display">{SITE.name}</span>
            <span className="label tag-sm">NPL · S3</span>
          </Link>
          <NavLinks />
        </div>
      </div>
    </header>
  );
}
