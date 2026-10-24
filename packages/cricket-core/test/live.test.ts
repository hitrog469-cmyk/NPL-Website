import { describe, expect, it } from "vitest";
import { ballToken, endsAfter, reconcile, replayInnings, runsCrossed, type LiveBall, type LiveEvent, type LiveSetup } from "../src";

const X = { wides: 0, noballs: 0, byes: 0, legbyes: 0, penalty: 0 };
const ball = (p: Partial<LiveBall> & { x?: Partial<typeof X> } = {}): LiveBall => ({
  batter: p.batter ?? "A",
  nonStriker: p.nonStriker ?? "B",
  bowler: p.bowler ?? "X",
  runsBat: p.runsBat ?? 0,
  extras: { ...X, ...p.x },
  isBoundary: p.isBoundary ?? false,
  wickets: p.wickets ?? [],
  newBatter: p.newBatter,
});

const setup: LiveSetup = { battingFirst: "a", bowlingFirst: "b", oversLimit: 20 };

/** Feed balls through replay, letting the engine decide the ends each time. */
function play(balls: Partial<LiveBall & { x: Partial<typeof X> }>[], bowlers: string[] = ["X", "Y"]) {
  const events: LiveEvent[] = [{ id: "e0", innings: 1, seq: 0, kind: "ends", payload: { striker: "A", nonStriker: "B" } }];
  for (const [i, b] of balls.entries()) {
    const st = replayInnings(events, 1, setup, null);
    const overNo = Math.floor(st.card.legalBalls / 6);
    events.push({
      id: `e${i + 1}`,
      innings: 1,
      seq: i + 1,
      kind: "delivery",
      payload: ball({ ...b, batter: b.batter ?? st.striker!, nonStriker: b.nonStriker ?? st.nonStriker!, bowler: b.bowler ?? bowlers[overNo % bowlers.length] }),
    });
  }
  return { events, state: replayInnings(events, 1, setup, null) };
}

describe("strike rotation", () => {
  it("odd runs swap, even runs do not", () => {
    expect(endsAfter(ball({ runsBat: 1 }), false)).toEqual({ striker: "B", nonStriker: "A" });
    expect(endsAfter(ball({ runsBat: 2 }), false)).toEqual({ striker: "A", nonStriker: "B" });
    expect(endsAfter(ball({ runsBat: 3 }), false)).toEqual({ striker: "B", nonStriker: "A" });
  });

  it("boundaries do not cross, a run four of 4 does not either, run three does", () => {
    expect(endsAfter(ball({ runsBat: 4, isBoundary: true }), false).striker).toBe("A");
    expect(endsAfter(ball({ runsBat: 4 }), false).striker).toBe("A");
  });

  it("single leg-bye and one run on a wide cross", () => {
    expect(runsCrossed(ball({ x: { legbyes: 1 } }))).toBe(1);
    expect(runsCrossed(ball({ x: { wides: 2 } }))).toBe(1);
    expect(endsAfter(ball({ x: { wides: 1 } }), false).striker).toBe("A");
  });

  it("end of over swaps ends", () => {
    expect(endsAfter(ball({ runsBat: 0 }), true)).toEqual({ striker: "B", nonStriker: "A" });
    expect(endsAfter(ball({ runsBat: 1 }), true)).toEqual({ striker: "A", nonStriker: "B" });
  });

  it("caught: new batter on strike, even if they crossed", () => {
    const b = ball({ runsBat: 0, wickets: [{ kind: "caught", playerOut: "A", fielders: [] }], newBatter: "C" });
    expect(endsAfter(b, false)).toEqual({ striker: "C", nonStriker: "B" });
  });

  it("caught off the last ball of the over: new batter at the non-striker's end", () => {
    const b = ball({ wickets: [{ kind: "caught", playerOut: "A", fielders: [] }], newBatter: "C" });
    expect(endsAfter(b, true)).toEqual({ striker: "B", nonStriker: "C" });
  });

  it("bowled: replacement takes the striker's end", () => {
    const b = ball({ wickets: [{ kind: "bowled", playerOut: "A", fielders: [] }], newBatter: "C" });
    expect(endsAfter(b, false)).toEqual({ striker: "C", nonStriker: "B" });
  });

  it("non-striker run out after a completed single: replacement goes where the out batter ended up", () => {
    const b = ball({ runsBat: 1, wickets: [{ kind: "run out", playerOut: "B", fielders: [] }], newBatter: "C" });
    // After crossing, B was at the striker's end.
    expect(endsAfter(b, false)).toEqual({ striker: "C", nonStriker: "A" });
  });
});

describe("replay", () => {
  it("a full over with a wide: six legal balls, ends swap, bowler cleared", () => {
    const { state } = play([{ runsBat: 1 }, { x: { wides: 1 } }, { runsBat: 4, isBoundary: true }, {}, { runsBat: 2 }, {}, { runsBat: 1 }]);
    expect(state.card.legalBalls).toBe(6);
    expect(state.card.runs).toBe(9);
    expect(state.bowler).toBeNull();
    expect(state.lastBowler).toBe("X");
    expect(state.legalInOver).toBe(6);
    // Single off the last ball keeps that batter on strike for the next over: B hit it, so B faces.
    expect(state.striker).toBe("B");
    expect(reconcile(state.card)).toEqual([]);
  });

  it("undo voids a delivery and everything is rebuilt", () => {
    const { events } = play([{ runsBat: 1 }, { runsBat: 6, isBoundary: true }]);
    events.push({ id: "v", innings: 1, seq: 99, kind: "void", payload: { target: "e2" } });
    const st = replayInnings(events, 1, setup, null);
    expect(st.card.runs).toBe(1);
    expect(st.card.legalBalls).toBe(1);
    expect(st.striker).toBe("B");
  });

  it("tags attach to the delivery they name and disappear when it is voided", () => {
    const { events } = play([{ runsBat: 4, isBoundary: true }]);
    events.push({ id: "t", innings: 1, seq: 50, kind: "tag", payload: { target: "e1", shot: { angle: 90, distance: 1 } } });
    expect(replayInnings(events, 1, setup, null).shots).toHaveLength(1);
    events.push({ id: "v", innings: 1, seq: 51, kind: "void", payload: { target: "e1" } });
    expect(replayInnings(events, 1, setup, null).shots).toHaveLength(0);
  });

  it("partnership resets on a wicket", () => {
    const { state } = play([{ runsBat: 2 }, { wickets: [{ kind: "bowled", playerOut: "A", fielders: [] }], newBatter: "C" }, { runsBat: 1 }]);
    expect(state.partnership).toEqual({ runs: 1, balls: 1 });
    expect(state.card.wickets).toBe(1);
  });

  it("chase completes when the target is reached", () => {
    const events: LiveEvent[] = [
      { id: "s", innings: 2, seq: 0, kind: "ends", payload: { striker: "P", nonStriker: "Q" } },
      { id: "d", innings: 2, seq: 1, kind: "delivery", payload: ball({ batter: "P", nonStriker: "Q", runsBat: 6, isBoundary: true }) },
    ];
    expect(replayInnings(events, 2, setup, 6).complete).toBe(true);
    expect(replayInnings(events, 2, setup, 7).complete).toBe(false);
  });

  it("innings two bats the side that bowled first", () => {
    expect(replayInnings([], 2, setup, 100).innings.battingTeam).toBe("b");
  });
});

describe("ball tokens", () => {
  const d = (p: Partial<LiveBall> & { x?: Partial<typeof X> }) => ({ seq: 0, over: 0, ...ball(p) });
  it("formats", () => {
    expect(ballToken(d({}))).toBe("•");
    expect(ballToken(d({ runsBat: 4, isBoundary: true }))).toBe("4");
    expect(ballToken(d({ x: { wides: 1 } }))).toBe("wd");
    expect(ballToken(d({ x: { wides: 3 } }))).toBe("2wd");
    expect(ballToken(d({ runsBat: 6, x: { noballs: 1 } }))).toBe("nb6");
    expect(ballToken(d({ x: { legbyes: 2 } }))).toBe("2lb");
    expect(ballToken(d({ wickets: [{ kind: "bowled", playerOut: "A", fielders: [] }] }))).toBe("W");
    expect(ballToken(d({ runsBat: 1, wickets: [{ kind: "run out", playerOut: "B", fielders: [] }] }))).toBe("W1");
  });
});
