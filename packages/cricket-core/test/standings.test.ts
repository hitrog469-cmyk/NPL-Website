import { describe, expect, it } from "vitest";
import { ASSUMED_T20_RULES, computeStandings, type ResultSummary } from "../src";

const inn = (team: string, runs: number, legalBalls: number, allOut = false) => ({ team, runs, legalBalls, allOut, oversLimit: 20 });

describe("standings", () => {
  it("awards points and computes NRR with legal balls", () => {
    const r: ResultSummary = {
      matchId: "m1",
      teams: ["a", "b"],
      outcome: { type: "win", winner: "a", by: { runs: 20 }, method: null },
      innings: [inn("a", 180, 120), inn("b", 160, 120)],
    };
    const [a, b] = computeStandings(["a", "b"], [r], ASSUMED_T20_RULES);
    expect(a).toMatchObject({ team: "a", played: 1, won: 1, points: 2 });
    expect(b).toMatchObject({ team: "b", lost: 1, points: 0 });
    expect(a!.nrr).toBeCloseTo(1.0, 6);
    expect(b!.nrr).toBeCloseTo(-1.0, 6);
  });

  it("all-out innings count the full quota of overs", () => {
    // b bowled out for 100 in 15 overs: NRR uses 20 overs, not 15.
    const r: ResultSummary = {
      matchId: "m1",
      teams: ["a", "b"],
      outcome: { type: "win", winner: "a", by: { runs: 50 }, method: null },
      innings: [inn("a", 150, 120), inn("b", 100, 90, true)],
    };
    const rows = computeStandings(["a", "b"], [r], ASSUMED_T20_RULES);
    const a = rows.find((x) => x.team === "a")!;
    expect(a.ballsBowled).toBe(120);
    expect(a.nrr).toBeCloseTo(150 / 20 - 100 / 20, 6);
  });

  it("a chase won early uses actual balls faced", () => {
    const r: ResultSummary = {
      matchId: "m1",
      teams: ["a", "b"],
      outcome: { type: "win", winner: "b", by: { wickets: 5 }, method: null },
      innings: [inn("a", 120, 120), inn("b", 121, 84)],
    };
    const b = computeStandings(["a", "b"], [r], ASSUMED_T20_RULES).find((x) => x.team === "b")!;
    expect(b.nrr).toBeCloseTo((121 * 6) / 84 - 120 / 20, 6);
  });

  it("no result gives a point each and no NRR", () => {
    const r: ResultSummary = { matchId: "m1", teams: ["a", "b"], outcome: { type: "no-result" }, innings: [inn("a", 40, 30)] };
    const rows = computeStandings(["a", "b"], [r], ASSUMED_T20_RULES);
    expect(rows.every((x) => x.points === 1 && x.noResult === 1 && x.nrr === null)).toBe(true);
  });

  it("a tie decided by Super Over: configurable", () => {
    const r: ResultSummary = {
      matchId: "m1",
      teams: ["a", "b"],
      outcome: { type: "tie", superOverWinner: "b" },
      innings: [inn("a", 140, 120), inn("b", 140, 120)],
    };
    const decided = computeStandings(["a", "b"], [r], ASSUMED_T20_RULES);
    expect(decided[0]).toMatchObject({ team: "b", won: 1, points: 2 });
    const split = computeStandings(["a", "b"], [r], { ...ASSUMED_T20_RULES, superOverDecidesTie: false });
    expect(split.every((x) => x.tied === 1 && x.points === 1)).toBe(true);
    // Main-match totals feed NRR; the Super Over does not.
    expect(decided.every((x) => x.nrr === 0)).toBe(true);
  });

  it("matches awaiting review are excluded entirely", () => {
    const r: ResultSummary = { matchId: "m1", teams: ["a", "b"], outcome: { type: "requires-review", note: "DLS target missing" }, innings: [] };
    expect(computeStandings(["a", "b"], [r], ASSUMED_T20_RULES).every((x) => x.played === 0)).toBe(true);
  });

  it("points sum to 2 per decided match plus tie/NR points", () => {
    const results: ResultSummary[] = [
      { matchId: "1", teams: ["a", "b"], outcome: { type: "win", winner: "a", by: {}, method: null }, innings: [inn("a", 1, 6), inn("b", 0, 6)] },
      { matchId: "2", teams: ["b", "c"], outcome: { type: "no-result" }, innings: [] },
      { matchId: "3", teams: ["c", "a"], outcome: { type: "win", winner: "c", by: {}, method: null }, innings: [inn("c", 1, 6), inn("a", 0, 6)] },
    ];
    const total = computeStandings(["a", "b", "c"], results, ASSUMED_T20_RULES).reduce((s, x) => s + x.points, 0);
    expect(total).toBe(2 + 2 + 2);
  });

  it("rejects unknown teams instead of silently dropping them", () => {
    const r: ResultSummary = { matchId: "m1", teams: ["a", "z"], outcome: { type: "no-result" }, innings: [] };
    expect(() => computeStandings(["a", "b"], [r], ASSUMED_T20_RULES)).toThrow(/unknown team/);
  });
});
