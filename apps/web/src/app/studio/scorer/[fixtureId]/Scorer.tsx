"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ballToken, oversDisplay, type LiveBall, type LiveEvent, type WicketKind } from "@npl/cricket-core";
import { supabase } from "@/lib/supabase";
import { useLiveMatch, useMatchView, type LiveSetupRow, type LiveStatus } from "@/lib/live";
import { WagonWheel } from "@/components/live/WagonWheel";

export interface ScorerTeam {
  id: string;
  name: string;
  shortName: string;
  squad: string[];
}

const ZERO = { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalty: 0 };
const WICKETS: WicketKind[] = ["bowled", "caught", "lbw", "run out", "stumped", "caught and bowled", "hit wicket", "retired hurt", "retired out"];

type Extra = null | "wd" | "nb" | "b" | "lb";
type Pending = { id: string; innings: number; seq: number; kind: LiveEvent["kind"]; payload: unknown };

export function Scorer({ fixtureId, label, teams }: { fixtureId: string; label: string; teams: [ScorerTeam, ScorerTeam] }) {
  const sb = supabase();
  const [session, setSession] = useState<Session | null>(null);
  const [admin, setAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    if (!sb) return;
    void sb.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = sb.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, [sb]);

  useEffect(() => {
    if (!sb || !session) return setAdmin(null);
    void sb.rpc("is_admin").then(({ data }) => setAdmin(data === true));
  }, [sb, session]);

  if (!sb) return <Box>Supabase is not configured. Add the env vars and redeploy.</Box>;
  if (!session) return <Login />;
  if (admin === null) return <Box>Checking access…</Box>;
  if (!admin)
    return (
      <Box>
        Signed in as {session.user.email}, but this account is not a scorer. Add it to <code>public.admins</code> in Supabase.
        <button className="sc-btn" onClick={() => sb.auth.signOut()}>Sign out</button>
      </Box>
    );
  return <Console fixtureId={fixtureId} label={label} teams={teams} />;
}

function Box({ children }: { children: React.ReactNode }) {
  return <div className="sc-box">{children}</div>;
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="sc-box"
      onSubmit={async (e) => {
        e.preventDefault();
        const { error } = await supabase()!.auth.signInWithPassword({ email, password });
        setErr(error?.message ?? null);
      }}
    >
      <p className="label">Scorer sign-in</p>
      <input className="sc-input" type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className="sc-input" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
      <button className="sc-btn sc-primary">Sign in</button>
      {err && <p className="sc-err">{err}</p>}
    </form>
  );
}

function Console({ fixtureId, label, teams }: { fixtureId: string; label: string; teams: [ScorerTeam, ScorerTeam] }) {
  const sb = supabase()!;
  const { events, setEvents, match, setMatch, conn, seen } = useLiveMatch(fixtureId);
  const setup = match?.setup;
  const view = useMatchView(events, setup);
  const cur = view.current;
  const innNo = view.currentNo || 1;
  const byId = (id?: string) => teams.find((t) => t.id === id);
  const batting = byId(cur?.innings.battingTeam);
  const bowling = byId(cur?.innings.bowlingTeam);

  /* ---------- offline-tolerant event queue ---------- */
  const storeKey = `npl-pending-${fixtureId}`;
  const [pending, setPending] = useState<Pending[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(storeKey) ?? "[]") as Pending[];
    } catch {
      return [];
    }
  });
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  useEffect(() => {
    try {
      localStorage.setItem(storeKey, JSON.stringify(pending));
    } catch {
      /* storage unavailable: queue still lives in memory */
    }
  }, [pending, storeKey]);

  const flush = useCallback(async () => {
    for (const p of pendingRef.current) {
      const { error } = await sb.from("ball_events").insert({ id: p.id, fixture_id: fixtureId, innings: p.innings, seq: p.seq, kind: p.kind, payload: p.payload });
      if (!error || error.code === "23505") {
        // 23505 on our own id means an earlier attempt landed: treat as synced.
        if (error) {
          const { data } = await sb.from("ball_events").select("id").eq("id", p.id).maybeSingle();
          if (!data) {
            alert("Another device scored this ball first. Reloading the match log.");
            setPending((q) => q.filter((x) => x.id !== p.id));
            location.reload();
            return;
          }
        }
        setPending((q) => q.filter((x) => x.id !== p.id));
      } else return; // network or auth problem: keep the queue, retry later
    }
  }, [sb, fixtureId]);

  useEffect(() => {
    const t = setInterval(() => void flush(), 3000);
    return () => clearInterval(t);
  }, [flush]);

  // Show unsynced events locally.
  useEffect(() => {
    const missing = pending.filter((p) => !seen.current.has(p.id));
    if (missing.length) {
      missing.forEach((p) => seen.current.add(p.id));
      setEvents((prev) => [...prev, ...missing.map((p) => p as unknown as LiveEvent)]);
    }
  }, [pending, seen, setEvents]);

  const append = (kind: LiveEvent["kind"], payload: unknown, innings = innNo) => {
    const seq = Math.max(-1, ...events.filter((e) => e.innings === innings).map((e) => e.seq)) + 1;
    const p: Pending = { id: crypto.randomUUID(), innings, seq, kind, payload };
    seen.current.add(p.id);
    setEvents((prev) => [...prev, p as unknown as LiveEvent]);
    setPending((q) => [...q, p]);
    setTimeout(() => void flush(), 0);
    return p.id;
  };

  const saveMatch = async (patch: { status?: LiveStatus; setup?: LiveSetupRow; result?: unknown; note?: string | null }) => {
    const row = { fixture_id: fixtureId, ...patch };
    setMatch((m) => (m ? { ...m, ...(patch as object) } : m));
    const { error } = await sb.from("live_matches").upsert(row);
    if (error) alert(`Could not save match state: ${error.message}`);
  };

  /* ---------- ball entry ---------- */
  const [extra, setExtra] = useState<Extra>(null);
  const [bowler, setBowler] = useState<string>("");
  const [wicketOpen, setWicketOpen] = useState(false);
  const [tagFor, setTagFor] = useState<string | null>(null);

  useEffect(() => {
    if (cur?.bowler) setBowler(cur.bowler);
    else if (cur && cur.legalInOver === 6) setBowler("");
  }, [cur?.bowler, cur?.legalInOver, cur]);

  const needOpeners = !!cur && !cur.striker && cur.card.legalBalls === 0 && cur.deliveries.length === 0;
  const needBowler = !!cur && !bowler;

  const send = (b: Omit<LiveBall, "batter" | "nonStriker" | "bowler">) => {
    if (!cur?.striker || !cur.nonStriker || !bowler) return;
    const id = append("delivery", { ...b, batter: cur.striker, nonStriker: cur.nonStriker, bowler });
    setExtra(null);
    if (b.runsBat > 0 && !b.extras.wides) setTagFor(id);
    else setTagFor(null);
    if (navigator.vibrate) navigator.vibrate(15);
  };

  const tapRuns = (n: number) => {
    const boundary = n === 4 || n === 6;
    if (extra === "wd") send({ runsBat: 0, extras: { ...ZERO, wides: 1 + n }, isBoundary: n === 4, wickets: [] });
    else if (extra === "nb") send({ runsBat: n, extras: { ...ZERO, noballs: 1 }, isBoundary: boundary, wickets: [] });
    else if (extra === "b") send({ runsBat: 0, extras: { ...ZERO, byes: n }, isBoundary: n === 4, wickets: [] });
    else if (extra === "lb") send({ runsBat: 0, extras: { ...ZERO, legbyes: n }, isBoundary: n === 4, wickets: [] });
    else send({ runsBat: n, extras: ZERO, isBoundary: boundary, wickets: [] });
  };

  const undo = () => {
    const last = cur?.deliveries.at(-1);
    if (!last) return;
    if (!confirm(`Undo last ball (${ballToken(last.delivery)})?`)) return;
    append("void", { target: last.eventId });
    setTagFor(null);
  };

  /* ---------- derived lists ---------- */
  const batted = new Set(cur?.card.batters.map((b) => b.player) ?? []);
  const atCrease = new Set([cur?.striker, cur?.nonStriker].filter(Boolean) as string[]);
  const outOrIn = new Set([...(cur?.card.batters.filter((b) => b.status === "out").map((b) => b.player) ?? []), ...atCrease]);
  const nextBatters = (batting?.squad ?? []).filter((p) => !outOrIn.has(p));
  const bowlerOvers = new Map(cur?.card.bowlers.map((b) => [b.player, b.legalBalls]) ?? []);
  const maxBalls = Math.floor((setup?.oversLimit ?? 20) / 5) * 6;

  const chase = view.target !== null && innNo === 2 && cur;
  const rrr = chase ? ((view.target! - cur.card.runs) * 6) / Math.max(1, cur.innings.oversLimit * 6 - cur.card.legalBalls) : null;

  /* ---------- render ---------- */
  return (
    <div className="sc">
      <header className="sc-head">
        <div>
          <p className="label">{label}</p>
          <p className="label muted">Status: {match?.status ?? "…"}</p>
        </div>
        <span className={`sc-conn sc-conn--${pending.length ? "pending" : conn}`}>
          {pending.length ? `PENDING ${pending.length}` : conn === "live" ? "SYNCED" : conn.toUpperCase()}
        </span>
      </header>

      {!setup?.battingFirst ? (
        <Toss teams={teams} onSave={(battingFirst, toss) => saveMatch({ status: "live", setup: { battingFirst, bowlingFirst: teams.find((t) => t.id !== battingFirst)!.id, oversLimit: 20, toss, currentInnings: 1 } })} />
      ) : (
        <>
          <section className="sc-score">
            <p className="label">{batting?.name} · innings {innNo}</p>
            <p className="display sc-big num">
              {cur?.card.runs ?? 0}/{cur?.card.wickets ?? 0} <span className="sc-ov">({oversDisplay(cur?.card.legalBalls ?? 0)})</span>
            </p>
            {chase && (
              <p className="label">
                Need {Math.max(0, view.target! - cur.card.runs)} from {cur.innings.oversLimit * 6 - cur.card.legalBalls} · RRR {rrr!.toFixed(2)}
              </p>
            )}
            <div className="sc-over">{cur?.thisOver.map((d, i) => <span key={i} className={`tok tok-${tokClass(ballToken(d))}`}>{ballToken(d)}</span>)}</div>
          </section>

          {needOpeners ? (
            <Openers squad={batting?.squad ?? []} bowlers={bowling?.squad ?? []} onSave={(s, n, b) => { append("ends", { striker: s, nonStriker: n }); setBowler(b); if (match?.status !== "live") void saveMatch({ status: "live" }); }} />
          ) : cur?.complete ? (
            <InningsOver
              innNo={innNo}
              view={view}
              teams={teams}
              onNext={() => saveMatch({ status: "innings_break", setup: { ...setup, currentInnings: 2 } })}
              onResult={(winner, text) => saveMatch({ status: "completed", result: { winner, text } })}
            />
          ) : (
            <>
              <section className="sc-crease">
                <button className="sc-bat on" onClick={() => {}}>{cur?.striker ?? "—"} *<small>{batLine(cur, cur?.striker)}</small></button>
                <button className="sc-bat" onClick={() => {}}>{cur?.nonStriker ?? "—"}<small>{batLine(cur, cur?.nonStriker)}</small></button>
                <button className="sc-btn" onClick={() => cur?.striker && cur.nonStriker && append("ends", { striker: cur.nonStriker, nonStriker: cur.striker })}>⇄ Swap</button>
              </section>

              <section className="sc-bowl">
                <label className="label" htmlFor="bowler">Bowler {needBowler && <strong className="sc-err">— choose for the new over</strong>}</label>
                <input
                  id="bowler"
                  className="sc-input"
                  list="bowlers"
                  value={bowler}
                  onChange={(e) => setBowler(e.target.value)}
                  placeholder="Bowler name"
                />
                <datalist id="bowlers">
                  {(bowling?.squad ?? []).filter((p) => p !== cur?.lastBowler && (bowlerOvers.get(p) ?? 0) < maxBalls).map((p) => <option key={p} value={p} />)}
                </datalist>
                {bowler && bowler === cur?.lastBowler && cur?.legalInOver === 6 && <p className="sc-err">Same bowler bowled the last over.</p>}
                {bowler && (bowlerOvers.get(bowler) ?? 0) >= maxBalls && <p className="sc-err">{bowler} has bowled their quota.</p>}
              </section>

              <section className={`sc-pad ${needBowler ? "disabled" : ""}`} aria-disabled={needBowler}>
                {extra && <p className="label sc-mode">{({ wd: "WIDE + runs?", nb: "NO-BALL + bat runs?", b: "BYES: how many?", lb: "LEG-BYES: how many?" } as const)[extra]} <button onClick={() => setExtra(null)}>cancel</button></p>}
                <div className="sc-keys">
                  {[0, 1, 2, 3, 4, 6].map((n) => (
                    <button key={n} className={`sc-key ${n >= 4 ? "sc-bdy" : ""}`} disabled={needBowler} onClick={() => tapRuns(n)}>{n === 0 && !extra ? "•" : n}</button>
                  ))}
                  <button className="sc-key sc-w" disabled={needBowler} onClick={() => setWicketOpen(true)}>W</button>
                  <button className={`sc-key sc-x ${extra === "wd" ? "on" : ""}`} disabled={needBowler} onClick={() => setExtra(extra === "wd" ? null : "wd")}>Wd</button>
                  <button className={`sc-key sc-x ${extra === "nb" ? "on" : ""}`} disabled={needBowler} onClick={() => setExtra(extra === "nb" ? null : "nb")}>Nb</button>
                  <button className={`sc-key sc-x ${extra === "b" ? "on" : ""}`} disabled={needBowler} onClick={() => setExtra(extra === "b" ? null : "b")}>B</button>
                  <button className={`sc-key sc-x ${extra === "lb" ? "on" : ""}`} disabled={needBowler} onClick={() => setExtra(extra === "lb" ? null : "lb")}>Lb</button>
                  <button className="sc-key" disabled={needBowler} onClick={() => tapRuns(5)}>5</button>
                </div>
                <div className="sc-row">
                  <button className="sc-btn" disabled={needBowler} onClick={() => send({ runsBat: 4, extras: ZERO, isBoundary: false, wickets: [] })}>4 run (no boundary)</button>
                  <button className="sc-btn sc-danger" onClick={undo}>Undo last ball</button>
                </div>
              </section>

              {tagFor && (
                <section className="sc-tag">
                  <div className="sc-row"><p className="label">Shot direction (optional)</p><button className="sc-btn" onClick={() => setTagFor(null)}>Skip</button></div>
                  <WagonWheel shots={[]} label="Tap where the ball went" onPick={(t) => { append("tag", { target: tagFor, shot: t }); setTagFor(null); }} />
                </section>
              )}

              {wicketOpen && cur && (
                <WicketSheet
                  striker={cur.striker!}
                  nonStriker={cur.nonStriker!}
                  fielders={bowling?.squad ?? []}
                  nextBatters={nextBatters}
                  onCancel={() => setWicketOpen(false)}
                  onConfirm={(w) => { send(w); setWicketOpen(false); }}
                />
              )}

              <details className="sc-more">
                <summary className="label">Match controls</summary>
                <div className="sc-row">
                  <button className="sc-btn" onClick={() => saveMatch({ status: "delayed" })}>Delay / rain</button>
                  <button className="sc-btn" onClick={() => saveMatch({ status: "live" })}>Resume live</button>
                  <button className="sc-btn" onClick={() => send({ runsBat: 0, extras: { ...ZERO, penalty: 5 }, isBoundary: false, wickets: [] })}>+5 penalty</button>
                </div>
                <div className="sc-row">
                  {innNo === 1 && <button className="sc-btn" onClick={() => confirm("End the first innings now?") && saveMatch({ status: "innings_break", setup: { ...setup, currentInnings: 2 } })}>End innings early</button>}
                  <button className="sc-btn" onClick={() => confirm("Mark as no result?") && saveMatch({ status: "no_result", result: { text: "No result" } })}>No result</button>
                </div>
                <RevisedTarget setup={setup} onSave={(rt) => saveMatch({ setup: { ...setup, revisedTarget: rt } })} />
              </details>
            </>
          )}

          <section className="sc-log">
            <p className="label muted">Batted: {[...batted].join(", ") || "—"}</p>
            <p><a href={`/live/${fixtureId}`} target="_blank" rel="noopener">Open public live page ↗</a></p>
          </section>
        </>
      )}

      {fixtureId === "rehearsal" && (
        <button
          className="sc-btn sc-danger"
          onClick={async () => {
            if (!confirm("Wipe the rehearsal match and start again?")) return;
            setPending([]);
            const { error } = await sb.rpc("reset_rehearsal");
            if (error) alert(error.message);
            else location.reload();
          }}
        >
          Reset rehearsal
        </button>
      )}
    </div>
  );
}

const tokClass = (t: string) => (t.startsWith("W") ? "w" : t === "4" || t === "6" ? "b" : /wd|nb|lb|b/.test(t) ? "x" : "n");

function batLine(cur: ReturnType<typeof useMatchView>["current"], p?: string | null) {
  const b = cur?.card.batters.find((x) => x.player === p);
  return b ? ` ${b.runs} (${b.balls})` : " 0 (0)";
}

function Toss({ teams, onSave }: { teams: [ScorerTeam, ScorerTeam]; onSave: (battingFirst: string, toss: { winner: string; decision: "bat" | "field" }) => void }) {
  const [winner, setWinner] = useState<string>("");
  const [decision, setDecision] = useState<"bat" | "field" | "">("");
  return (
    <section className="sc-box">
      <p className="label">Toss won by</p>
      <div className="sc-row">{teams.map((t) => <button key={t.id} className={`sc-btn ${winner === t.id ? "sc-primary" : ""}`} onClick={() => setWinner(t.id)}>{t.name}</button>)}</div>
      <p className="label">Elected to</p>
      <div className="sc-row">{(["bat", "field"] as const).map((d) => <button key={d} className={`sc-btn ${decision === d ? "sc-primary" : ""}`} onClick={() => setDecision(d)}>{d}</button>)}</div>
      <button
        className="sc-btn sc-primary"
        disabled={!winner || !decision}
        onClick={() => {
          const other = teams.find((t) => t.id !== winner)!.id;
          onSave(decision === "bat" ? winner : other, { winner, decision: decision as "bat" | "field" });
        }}
      >
        Start match
      </button>
    </section>
  );
}

function PlayerInput({ id, label, options, value, onChange }: { id: string; label: string; options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <>
      <label className="label" htmlFor={id}>{label}</label>
      <input id={id} className="sc-input" list={`${id}-list`} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Type or pick" />
      <datalist id={`${id}-list`}>{options.map((o) => <option key={o} value={o} />)}</datalist>
    </>
  );
}

function Openers({ squad, bowlers, onSave }: { squad: string[]; bowlers: string[]; onSave: (s: string, n: string, b: string) => void }) {
  const [s, setS] = useState("");
  const [n, setN] = useState("");
  const [b, setB] = useState("");
  return (
    <section className="sc-box">
      <PlayerInput id="op1" label="Striker" options={squad} value={s} onChange={setS} />
      <PlayerInput id="op2" label="Non-striker" options={squad.filter((x) => x !== s)} value={n} onChange={setN} />
      <PlayerInput id="ob" label="Opening bowler" options={bowlers} value={b} onChange={setB} />
      <button className="sc-btn sc-primary" disabled={!s || !n || !b || s === n} onClick={() => onSave(s.trim(), n.trim(), b.trim())}>Start innings</button>
    </section>
  );
}

function WicketSheet({
  striker, nonStriker, fielders, nextBatters, onCancel, onConfirm,
}: {
  striker: string; nonStriker: string; fielders: string[]; nextBatters: string[];
  onCancel: () => void; onConfirm: (b: Omit<LiveBall, "batter" | "nonStriker" | "bowler">) => void;
}) {
  const [kind, setKind] = useState<WicketKind>("bowled");
  const [out, setOut] = useState(striker);
  const [fielder, setFielder] = useState("");
  const [runs, setRuns] = useState(0);
  const [ball, setBall] = useState<"legal" | "wide" | "noball">("legal");
  const [next, setNext] = useState("");
  const [allOut, setAllOut] = useState(false);
  const needsFielder = kind === "caught" || kind === "run out" || kind === "stumped";
  const canChooseOut = kind === "run out" || kind === "retired hurt" || kind === "retired out";

  return (
    <div className="sc-sheet" role="dialog" aria-label="Wicket">
      <p className="label">How out</p>
      <div className="sc-chips">{WICKETS.map((k) => <button key={k} className={`sc-chip ${kind === k ? "on" : ""}`} onClick={() => { setKind(k); if (!["run out", "retired hurt", "retired out"].includes(k)) setOut(striker); }}>{k}</button>)}</div>
      {canChooseOut && (
        <>
          <p className="label">Who</p>
          <div className="sc-row">{[striker, nonStriker].map((p) => <button key={p} className={`sc-btn ${out === p ? "sc-primary" : ""}`} onClick={() => setOut(p)}>{p}</button>)}</div>
        </>
      )}
      {needsFielder && <PlayerInput id="wf" label="Fielder (optional)" options={fielders} value={fielder} onChange={setFielder} />}
      {(kind === "run out" || kind === "stumped") && (
        <>
          <p className="label">Delivery</p>
          <div className="sc-row">{(["legal", "wide", "noball"] as const).map((x) => <button key={x} className={`sc-btn ${ball === x ? "sc-primary" : ""}`} onClick={() => setBall(x)}>{x}</button>)}</div>
        </>
      )}
      {kind === "run out" && (
        <>
          <p className="label">Runs completed before the run out</p>
          <div className="sc-row">{[0, 1, 2, 3].map((n) => <button key={n} className={`sc-btn ${runs === n ? "sc-primary" : ""}`} onClick={() => setRuns(n)}>{n}</button>)}</div>
        </>
      )}
      <PlayerInput id="nb" label="New batter" options={nextBatters} value={next} onChange={setNext} />
      <label className="sc-check"><input type="checkbox" checked={allOut} onChange={(e) => setAllOut(e.target.checked)} /> No batter comes in (all out)</label>
      <div className="sc-row">
        <button className="sc-btn" onClick={onCancel}>Cancel</button>
        <button
          className="sc-btn sc-danger"
          disabled={!allOut && !next.trim()}
          onClick={() =>
            onConfirm({
              runsBat: ball === "wide" ? 0 : runs,
              extras: { ...ZERO, wides: ball === "wide" ? 1 + runs : 0, noballs: ball === "noball" ? 1 : 0 },
              isBoundary: false,
              wickets: [{ kind, playerOut: out, fielders: fielder.trim() ? [fielder.trim()] : [] }],
              newBatter: allOut ? null : next.trim(),
            })
          }
        >
          Confirm wicket
        </button>
      </div>
    </div>
  );
}

function InningsOver({ innNo, view, teams, onNext, onResult }: {
  innNo: number; view: ReturnType<typeof useMatchView>; teams: [ScorerTeam, ScorerTeam];
  onNext: () => void; onResult: (winner: string | null, text: string) => void;
}) {
  const suggestion = useMemo(() => {
    if (!view.first || !view.second || view.target === null) return null;
    const a = view.first.card, b = view.second.card;
    const name = (id: string) => teams.find((t) => t.id === id)!.name;
    if (b.runs >= view.target) return { winner: b.battingTeam, text: `${name(b.battingTeam)} won by ${10 - b.wickets} wicket${10 - b.wickets === 1 ? "" : "s"}` };
    if (b.runs === view.target - 1) return { winner: null, text: "Match tied" };
    return { winner: a.battingTeam, text: `${name(a.battingTeam)} won by ${view.target - 1 - b.runs} run${view.target - 1 - b.runs === 1 ? "" : "s"}` };
  }, [view, teams]);

  if (innNo === 1)
    return (
      <section className="sc-box">
        <p className="label">First innings complete · target {view.first!.card.runs + 1}</p>
        <button className="sc-btn sc-primary" onClick={onNext}>Start second innings</button>
      </section>
    );
  return (
    <section className="sc-box">
      <p className="label">Match complete</p>
      <p className="display" style={{ fontSize: "1.75rem" }}>{suggestion?.text}</p>
      <button className="sc-btn sc-primary" onClick={() => suggestion && confirm(`Confirm result: ${suggestion.text}?`) && onResult(suggestion.winner, suggestion.text)}>Confirm result</button>
      <p className="caption">Ties go to a Super Over: score it outside the app for now and enter the result manually from Match controls.</p>
    </section>
  );
}

function RevisedTarget({ setup, onSave }: { setup: LiveSetupRow | undefined; onSave: (rt: { runs: number; overs: number } | null) => void }) {
  const [runs, setRuns] = useState(setup?.revisedTarget?.runs?.toString() ?? "");
  const [overs, setOvers] = useState(setup?.revisedTarget?.overs?.toString() ?? "");
  return (
    <div className="sc-row">
      <input className="sc-input" inputMode="numeric" placeholder="Revised target" value={runs} onChange={(e) => setRuns(e.target.value)} />
      <input className="sc-input" inputMode="numeric" placeholder="in overs" value={overs} onChange={(e) => setOvers(e.target.value)} />
      <button className="sc-btn" onClick={() => onSave(runs && overs ? { runs: Number(runs), overs: Number(overs) } : null)}>Set (DLS)</button>
    </div>
  );
}
