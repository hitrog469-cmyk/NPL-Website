"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { replayInnings, type LiveEvent, type LiveInningsState, type LiveSetup } from "@npl/cricket-core";
import { supabase } from "./supabase";

export type LiveStatus = "scheduled" | "toss" | "live" | "innings_break" | "delayed" | "completed" | "abandoned" | "no_result";

export interface LiveSetupRow extends Partial<LiveSetup> {
  toss?: { winner: string; decision: "bat" | "field" };
  xi?: Record<string, string[]>;
  currentInnings?: number;
}

export interface LiveMatchRow {
  fixture_id: string;
  status: LiveStatus;
  setup: LiveSetupRow;
  result: { winner?: string; text?: string } | null;
  note: string | null;
  updated_at: string;
}

interface Row {
  id: string;
  innings: number;
  seq: number;
  kind: LiveEvent["kind"];
  payload: unknown;
}

const toEvent = (r: Row) => ({ id: r.id, innings: r.innings, seq: r.seq, kind: r.kind, payload: r.payload }) as LiveEvent;

export type Connection = "connecting" | "live" | "offline" | "unconfigured";

/**
 * Subscribes to one match: loads the event log, then applies each new ball
 * the moment it is inserted. On reconnect it reloads the full log so a
 * dropped message can never leave the score wrong.
 */
export function useLiveMatch(fixtureId: string) {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [match, setMatch] = useState<LiveMatchRow | null>(null);
  const [conn, setConn] = useState<Connection>("connecting");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const seen = useRef(new Set<string>());

  useEffect(() => {
    const sb = supabase();
    if (!sb) {
      setConn("unconfigured");
      return;
    }
    let cancelled = false;

    const load = async () => {
      const [ev, lm] = await Promise.all([
        sb.from("ball_events").select("id,innings,seq,kind,payload").eq("fixture_id", fixtureId).order("innings").order("seq"),
        sb.from("live_matches").select("*").eq("fixture_id", fixtureId).maybeSingle(),
      ]);
      if (cancelled) return;
      if (ev.error || lm.error) {
        setConn("offline");
        return;
      }
      seen.current = new Set(ev.data.map((r) => r.id));
      setEvents(ev.data.map(toEvent));
      setMatch(lm.data as LiveMatchRow | null);
      setLastUpdate(new Date());
    };

    const channel = sb
      .channel(`match:${fixtureId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ball_events", filter: `fixture_id=eq.${fixtureId}` }, (p) => {
        const r = p.new as Row;
        if (seen.current.has(r.id)) return;
        seen.current.add(r.id);
        setEvents((prev) => [...prev, toEvent(r)]);
        setLastUpdate(new Date());
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "live_matches", filter: `fixture_id=eq.${fixtureId}` }, (p) => {
        setMatch(p.new as LiveMatchRow);
        setLastUpdate(new Date());
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConn("live");
          void load();
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") setConn("offline");
      });

    void load();
    return () => {
      cancelled = true;
      void sb.removeChannel(channel);
    };
  }, [fixtureId]);

  return { events, setEvents, match, setMatch, conn, lastUpdate, seen };
}

export interface MatchView {
  first: LiveInningsState | null;
  second: LiveInningsState | null;
  current: LiveInningsState | null;
  currentNo: number;
  target: number | null;
}

/** Derive both innings from the event log. */
export function useMatchView(events: LiveEvent[], setup: LiveSetupRow | undefined): MatchView {
  return useMemo(() => {
    if (!setup?.battingFirst || !setup.bowlingFirst) return { first: null, second: null, current: null, currentNo: 0, target: null };
    const s: LiveSetup = { battingFirst: setup.battingFirst, bowlingFirst: setup.bowlingFirst, oversLimit: setup.oversLimit ?? 20, revisedTarget: setup.revisedTarget ?? null };
    const first = replayInnings(events, 1, s, null);
    const has2 = events.some((e) => e.innings === 2) || (setup.currentInnings ?? 1) >= 2;
    const target = setup.revisedTarget?.runs ?? first.card.runs + 1;
    const second = has2 ? replayInnings(events, 2, s, target) : null;
    const currentNo = setup.currentInnings ?? (second ? 2 : 1);
    return { first, second, current: currentNo === 2 ? second : first, currentNo, target: second ? target : null };
  }, [events, setup]);
}
