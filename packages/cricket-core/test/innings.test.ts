import { describe, expect, it } from "vitest";
import { oversDisplay, reconcile, scoreInnings } from "../src";
import { innings } from "./helpers";

const bat = (card: ReturnType<typeof scoreInnings>, id: string) => card.batters.find((b) => b.player === id)!;
const bowl = (card: ReturnType<typeof scoreInnings>, id: string) => card.bowlers.find((b) => b.player === id)!;

describe("extras", () => {
  it("wide that runs away for four byes: 5 wides to bowler, no ball faced, not legal", () => {
    const card = scoreInnings(innings([{ x: { wides: 5 } }]));
    expect(card.runs).toBe(5);
    expect(card.legalBalls).toBe(0);
    expect(bat(card, "A").balls).toBe(0);
    expect(bowl(card, "X").runs).toBe(5);
    expect(bowl(card, "X").legalBalls).toBe(0);
    expect(reconcile(card)).toEqual([]);
  });

  it("no-ball hit for six: batter +6 and a ball faced, bowler +7, not a legal ball", () => {
    const card = scoreInnings(innings([{ runsBat: 6, x: { noballs: 1 } }]));
    expect(card.runs).toBe(7);
    expect(card.legalBalls).toBe(0);
    expect(bat(card, "A")).toMatchObject({ runs: 6, balls: 1, sixes: 1 });
    expect(bowl(card, "X")).toMatchObject({ runs: 7, legalBalls: 0, noballs: 1, sixes: 1 });
    expect(reconcile(card)).toEqual([]);
  });

  it("two wides then a no-ball at the same legal-ball index keep separate seq and the over still needs six legal balls", () => {
    const rows = [{ x: { wides: 1 } }, { x: { wides: 1 } }, { x: { noballs: 1 } }, ...Array.from({ length: 6 }, () => ({ runsBat: 1 }))];
    const card = scoreInnings(innings(rows));
    expect(card.legalBalls).toBe(6);
    expect(card.runs).toBe(9);
    expect(card.overs).toHaveLength(1);
    expect(card.overs[0]!.legalBalls).toBe(6);
    expect(bowl(card, "X")).toMatchObject({ runs: 9, wides: 2, noballs: 1, maidens: 0 });
    expect(reconcile(card)).toEqual([]);
  });

  it("byes and leg-byes go to the team, not the bowler, and count as a ball faced", () => {
    const card = scoreInnings(innings([{ x: { byes: 2 } }, { x: { legbyes: 4 } }]));
    expect(card.runs).toBe(6);
    expect(bowl(card, "X").runs).toBe(0);
    expect(bowl(card, "X").dots).toBe(2);
    expect(bat(card, "A")).toMatchObject({ runs: 0, balls: 2, dots: 2 });
    expect(reconcile(card)).toEqual([]);
  });

  it("penalty runs go to the team only", () => {
    const card = scoreInnings(innings([{ x: { penalty: 5 } }]));
    expect(card.runs).toBe(5);
    expect(bowl(card, "X").runs).toBe(0);
    expect(card.extras.total).toBe(5);
    expect(reconcile(card)).toEqual([]);
  });

  it("a maiden with leg-byes is still a maiden; one with a wide is not", () => {
    const six = (x?: object) => Array.from({ length: 6 }, (_, i) => (i === 0 && x ? { x } : {}));
    expect(bowl(scoreInnings(innings(six({ legbyes: 1 }))), "X").maidens).toBe(1);
    expect(bowl(scoreInnings(innings([{ x: { wides: 1 } }, ...six()])), "X").maidens).toBe(0);
  });
});

describe("boundaries", () => {
  it("a run four is not a boundary four", () => {
    const card = scoreInnings(innings([{ runsBat: 4, isBoundary: false }]));
    expect(bat(card, "A")).toMatchObject({ runs: 4, fours: 0 });
    expect(bowl(card, "X").fours).toBe(0);
  });

  it("a boundary four counts as a four", () => {
    expect(bat(scoreInnings(innings([{ runsBat: 4 }])), "A").fours).toBe(1);
  });
});

describe("dismissals", () => {
  it("run out on a no-ball: completed run counts, not a legal ball, not the bowler's wicket", () => {
    const card = scoreInnings(innings([{ runsBat: 1, x: { noballs: 1 }, wickets: [{ kind: "run out", playerOut: "B", fielders: ["F"] }] }]));
    expect(card.runs).toBe(2);
    expect(card.wickets).toBe(1);
    expect(card.legalBalls).toBe(0);
    expect(bowl(card, "X").wickets).toBe(0);
    expect(bat(card, "B").status).toBe("out");
    expect(card.fallOfWickets[0]).toMatchObject({ wicketNumber: 1, player: "B", score: 2, legalBalls: 0 });
    expect(reconcile(card)).toEqual([]);
  });

  it("retired hurt is not a wicket and the batter can come back", () => {
    const card = scoreInnings(
      innings([
        { runsBat: 4, wickets: [{ kind: "retired hurt", playerOut: "A", fielders: [] }] },
        { batter: "C", runsBat: 1 },
        { batter: "A", nonStriker: "C", runsBat: 2 },
      ]),
    );
    expect(card.wickets).toBe(0);
    expect(bat(card, "A")).toMatchObject({ runs: 6, balls: 2, status: "not out" });
    expect(card.fallOfWickets).toHaveLength(0);
    expect(reconcile(card)).toEqual([]);
  });

  it("retired hurt who never returns stays retired hurt and is not out", () => {
    const card = scoreInnings(innings([{ wickets: [{ kind: "retired hurt", playerOut: "A", fielders: [] }] }, { batter: "C" }]));
    expect(bat(card, "A").status).toBe("retired hurt");
    expect(card.wickets).toBe(0);
  });

  it("retired out is a team wicket but not the bowler's", () => {
    const card = scoreInnings(innings([{ wickets: [{ kind: "retired out", playerOut: "A", fielders: [] }] }]));
    expect(card.wickets).toBe(1);
    expect(bowl(card, "X").wickets).toBe(0);
    expect(bat(card, "A").status).toBe("out");
  });

  it("caught, stumped, lbw, hit wicket are the bowler's", () => {
    const kinds = ["caught", "stumped", "lbw", "hit wicket", "bowled", "caught and bowled"] as const;
    const rows = kinds.map((kind, i) => ({ batter: `P${i}`, wickets: [{ kind, playerOut: `P${i}`, fielders: [] }] }));
    const card = scoreInnings(innings(rows));
    expect(bowl(card, "X").wickets).toBe(6);
    expect(card.wickets).toBe(6);
  });

  it("a duck faced zero balls still counts as an innings with a dismissal (diamond duck via run out)", () => {
    const card = scoreInnings(innings([{ batter: "A", nonStriker: "B", wickets: [{ kind: "run out", playerOut: "B", fielders: [] }] }]));
    expect(bat(card, "B")).toMatchObject({ runs: 0, balls: 0, status: "out" });
  });

  it("all out at ten wickets", () => {
    const rows = Array.from({ length: 10 }, (_, i) => ({ batter: `P${i}`, wickets: [{ kind: "bowled" as const, playerOut: `P${i}`, fielders: [] }] }));
    expect(scoreInnings(innings(rows)).allOut).toBe(true);
  });
});

describe("batting order", () => {
  it("openers are striker then non-striker on the first ball; a non-striker who never faced still bats", () => {
    const card = scoreInnings(innings([{ batter: "A", nonStriker: "B" }]));
    expect(card.batters.map((b) => [b.player, b.position])).toEqual([["A", 1], ["B", 2]]);
    expect(bat(card, "B").balls).toBe(0);
  });
});

describe("over display", () => {
  it("is derived from integer legal balls, never stored as a decimal", () => {
    expect(oversDisplay(0)).toBe("0");
    expect(oversDisplay(1)).toBe("0.1");
    expect(oversDisplay(6)).toBe("1");
    expect(oversDisplay(119)).toBe("19.5");
    expect(oversDisplay(120)).toBe("20");
  });
});

describe("reconcile", () => {
  it("catches a card whose parts disagree", () => {
    const card = scoreInnings(innings([{ runsBat: 1 }]));
    card.runs = 2;
    expect(reconcile(card).length).toBeGreaterThan(0);
  });
});
