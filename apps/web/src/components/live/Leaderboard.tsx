"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface Row {
  display_name: string;
  points: number;
  correct: number;
  picked: number;
}

export function Leaderboard() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState(false);
  useEffect(() => {
    const sb = supabase();
    if (!sb) return setErr(true);
    void sb.rpc("leaderboard", { p_limit: 100 }).then(({ data, error }) => (error ? setErr(true) : setRows((data ?? []) as Row[])));
  }, []);
  if (err) return <p className="caption">Leaderboard unavailable right now.</p>;
  if (!rows) return <p className="caption">Loading…</p>;
  if (!rows.length)
    return (
      <div className="empty">
        <p className="display">No results yet</p>
        <p className="muted">The leaderboard fills in once the first match result is confirmed.</p>
      </div>
    );
  return (
    <div className="table-wrap">
      <table className="data">
        <thead><tr><th className="l">#</th><th className="l">Fan</th><th>Correct</th><th>Picked</th><th>Points</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className={i === 0 ? "top" : ""}>
              <td className="l rank">{i + 1}</td>
              <td className="l strong">{r.display_name}</td>
              <td>{r.correct}</td><td>{r.picked}</td><td className="big">{r.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
