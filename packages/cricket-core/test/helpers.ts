import type { Delivery, Extras, Innings } from "../src";

export type Row = Partial<Omit<Delivery, "seq" | "extras">> & { x?: Partial<Extras> };

/** Tiny builder for hand-worked innings. Players are short string ids. */
export function innings(rows: Row[], oversLimit = 20): Innings {
  const deliveries: Delivery[] = rows.map((r, i) => ({
    seq: i,
    over: r.over ?? 0,
    batter: r.batter ?? "A",
    nonStriker: r.nonStriker ?? "B",
    bowler: r.bowler ?? "X",
    runsBat: r.runsBat ?? 0,
    extras: { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalty: 0, ...r.x },
    isBoundary: r.isBoundary ?? (r.runsBat === 4 || r.runsBat === 6),
    wickets: r.wickets ?? [],
  }));
  return { battingTeam: "bat", bowlingTeam: "bowl", isSuperOver: false, oversLimit, target: null, deliveries };
}
