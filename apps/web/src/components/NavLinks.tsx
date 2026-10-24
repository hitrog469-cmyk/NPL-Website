"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Only routes that are actually shipped appear here.
const MAIN = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "NPL 2026", section: "npl" },
  { href: "/cricket", label: "Cricket" },
  { href: "/football", label: "Football" },
  { href: "/fan-zone", label: "Fan Zone" },
  { href: "/data-sources", label: "Data" },
];

const NPL = [
  { href: "/matches", label: "Matches" },
  { href: "/table", label: "Table" },
  { href: "/teams", label: "Teams" },
  { href: "/records", label: "Records" },
  { href: "/fan-zone", label: "Predict" },
];

const NPL_PATHS = ["/matches", "/table", "/teams", "/records", "/live"];
const inNpl = (p: string) => NPL_PATHS.some((x) => p === x || p.startsWith(x + "/"));

export function NavLinks() {
  const path = usePathname();
  const active = (l: (typeof MAIN)[number]) =>
    l.section === "npl" ? inNpl(path) : l.href === "/" ? path === "/" : path === l.href || path.startsWith(l.href + "/");
  return (
    <nav className="nav" aria-label="Main">
      {MAIN.map((l) => (
        <Link key={l.href} href={l.href} aria-current={active(l) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/** Second row shown on NPL pages only. */
export function NplSubnav() {
  const path = usePathname();
  if (!inNpl(path)) return null;
  return (
    <nav className="subnav" aria-label="NPL 2026">
      <div className="wrap">
        <span className="label subnav-title">NPL 2026</span>
        {NPL.map((l) => (
          <Link key={l.href} href={l.href} aria-current={path === l.href || path.startsWith(l.href + "/") ? "page" : undefined}>
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
