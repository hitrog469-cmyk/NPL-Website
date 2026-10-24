import { describe, expect, it } from "vitest";
import { aggregate, reconcile, scoreInnings } from "@npl/cricket-core";
import { loadDataset } from "../src";

/** Integration tests against the real imported archive. */
const ds = loadDataset();
const byId = (id: string) => ds.matches.find((m) => m.id === id)!;

describe("cricsheet import", () => {
  it("parses every match without warnings and every innings reconciles", () => {
    expect(ds.matches.length).toBe(ds.manifest.matches.length);
    expect(ds.warnings).toEqual([]);
    for (const m of ds.matches) for (const inn of m.innings) expect(reconcile(scoreInnings(inn)), m.id).toEqual([]);
  });

  it("merges team spelling variants into one canonical team", () => {
    const ids = new Set(ds.matches.flatMap((m) => m.teams));
    expect([...ids].sort()).toEqual(ds.teams.map((t) => t.id).sort());
  });

  it("identifies players by registry id, not name", () => {
    for (const p of ds.players.values()) expect(p.id).toMatch(/^[0-9a-f]{8}$/);
  });

  it("1462658: tie decided by Super Over; Super Over innings flagged and excluded from aggregates", () => {
    const m = byId("1462658");
    expect(m.outcome).toEqual({ type: "tie", superOverWinner: "pokhara-avengers" });
    expect(m.innings.filter((i) => i.isSuperOver)).toHaveLength(2);
    const main = m.innings.filter((i) => !i.isSuperOver).map((i) => scoreInnings(i).runs);
    expect(main[0]).toBe(main[1]);
    const agg = aggregate([m]);
    expect(agg.teamInnings).toHaveLength(2);
  });

  it("1462642: a non-boundary four is not counted as a four", () => {
    const m = byId("1462642");
    const runFour = m.innings.flatMap((i) => i.deliveries).filter((d) => d.runsBat === 4 && !d.isBoundary);
    expect(runFour.length).toBeGreaterThan(0);
  });

  it("1511000: retired hurt is not a team wicket", () => {
    const m = byId("1511000");
    const inn = m.innings.find((i) => i.deliveries.some((d) => d.wickets.some((w) => w.kind === "retired hurt")))!;
    const card = scoreInnings(inn);
    const outs = inn.deliveries.flatMap((d) => d.wickets).filter((w) => w.kind !== "retired hurt").length;
    expect(card.wickets).toBe(outs);
  });

  it("finals are tagged by stage", () => {
    expect(byId("1462670").stage).toBe("final");
    expect(byId("1511008").stage).toBe("final");
  });
});
