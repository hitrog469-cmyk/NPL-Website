"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

/** Thin strip under the masthead whenever a match is being scored. */
export function LiveNow({ labels }: { labels: Record<string, string> }) {
  const [live, setLive] = useState<{ fixture_id: string; status: string }[]>([]);
  useEffect(() => {
    const sb = supabase();
    if (!sb) return;
    const load = () =>
      void sb.from("live_matches").select("fixture_id,status").in("status", ["toss", "live", "innings_break", "delayed"]).neq("fixture_id", "rehearsal").then(({ data }) => setLive(data ?? []));
    load();
    const ch = sb.channel("live-now").on("postgres_changes", { event: "*", schema: "public", table: "live_matches" }, load).subscribe();
    return () => void sb.removeChannel(ch);
  }, []);
  if (!live.length) return null;
  return (
    <div className="live-now">
      <div className="wrap">
        {live.map((m) => (
          <Link key={m.fixture_id} href={`/live/${m.fixture_id}`}>
            <span className="live-dot" aria-hidden /> {m.status === "live" ? "LIVE" : m.status.replace("_", " ").toUpperCase()} · {labels[m.fixture_id] ?? m.fixture_id} →
          </Link>
        ))}
      </div>
    </div>
  );
}
