"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface PTeam {
  id: string;
  name: string;
  shortName: string;
  colour: string | null;
}

/**
 * Free fan prediction: pick the winner before the start. The database locks
 * picks at the scheduled start time; no money, no prizes.
 */
export function Prediction({ fixtureId, startsAtUtc, teams, result }: { fixtureId: string; startsAtUtc: string; teams: [PTeam, PTeam]; result: string | null }) {
  const sb = supabase();
  const [split, setSplit] = useState<Record<string, number>>({});
  const [mine, setMine] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const open = now < Date.parse(startsAtUtc);

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);

  const refresh = useCallback(async () => {
    if (!sb) return;
    const { data } = await sb.rpc("prediction_split", { p_fixture: fixtureId });
    setSplit(Object.fromEntries(((data ?? []) as { team: string; picks: number }[]).map((r) => [r.team, Number(r.picks)])));
    const { data: s } = await sb.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) return;
    const [{ data: p }, { data: pr }] = await Promise.all([
      sb.from("predictions").select("winner").eq("fixture_id", fixtureId).maybeSingle(),
      sb.from("profiles").select("display_name").eq("user_id", uid).maybeSingle(),
    ]);
    setMine(p?.winner ?? null);
    setName(pr?.display_name ?? null);
  }, [sb, fixtureId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!sb) return null;

  const pick = async (team: string) => {
    setBusy(true);
    setErr(null);
    try {
      let { data: s } = await sb.auth.getSession();
      if (!s.session) {
        const r = await sb.auth.signInAnonymously();
        if (r.error) throw r.error;
        s = { session: r.data.session };
      }
      if (!name) {
        const n = draftName.trim();
        if (n.length < 2) throw new Error("Pick a display name first (2–24 characters).");
        const { error } = await sb.from("profiles").upsert({ user_id: s.session!.user.id, display_name: n.slice(0, 24) });
        if (error) throw error;
        setName(n);
      }
      const { error } = await sb.from("predictions").upsert({ user_id: s.session!.user.id, fixture_id: fixtureId, winner: team });
      if (error) throw new Error(error.code === "42501" ? "Predictions for this match are closed." : error.message);
      setMine(team);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const total = teams.reduce((s, t) => s + (split[t.id] ?? 0), 0);

  return (
    <div className="pr">
      <h2 className="display">Fan prediction</h2>
      <p className="caption">Who wins? Free to play, no prizes. {open ? "Picks lock at the start." : "Picks are locked."}</p>
      {open && !name && (
        <input className="sc-input" placeholder="Your display name" maxLength={24} value={draftName} onChange={(e) => setDraftName(e.target.value)} aria-label="Display name" />
      )}
      <div className="pr-teams">
        {teams.map((t) => {
          const n = split[t.id] ?? 0;
          const pct = total ? Math.round((n / total) * 100) : 0;
          return (
            <button
              key={t.id}
              className={`pr-team ${mine === t.id ? "on" : ""} ${result === t.id ? "won" : ""}`}
              disabled={!open || busy}
              onClick={() => pick(t.id)}
              style={{ "--tc": t.colour ?? "var(--ink)" } as React.CSSProperties}
            >
              <span className="pr-bar" style={{ width: `${pct}%` }} aria-hidden />
              <span className="pr-name">{t.name}{mine === t.id ? " · your pick" : ""}</span>
              <span className="pr-pct num">{total ? `${pct}%` : "–"}</span>
            </button>
          );
        })}
      </div>
      <p className="caption">
        {total} fan pick{total === 1 ? "" : "s"}. Shows how people who played picked, not anyone&rsquo;s real chances. <Link href="/fan-zone">Leaderboard</Link>
      </p>
      {err && <p className="sc-err">{err}</p>}
    </div>
  );
}
