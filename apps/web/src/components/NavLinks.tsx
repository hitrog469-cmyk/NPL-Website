"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Only routes that are actually shipped appear here.
const LINKS = [
  { href: "/", label: "Home" },
  { href: "/matches", label: "Matches" },
  { href: "/table", label: "Table" },
  { href: "/records", label: "Records" },
  { href: "/data-sources", label: "Data" },
];

export function NavLinks() {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map((l) => (
        <Link key={l.href} href={l.href} aria-current={active(l.href) ? "page" : undefined}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}
