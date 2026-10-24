import type { Metadata } from "next";
import { FixtureList } from "@/components/FixtureList";
import { Leaderboard } from "@/components/live/Leaderboard";
import { upcomingFixtures } from "@/lib/data";

export const metadata: Metadata = { title: "Fan Zone", description: "Free NPL match predictions and the season leaderboard." };

export default function FanZone() {
  return (
    <>
      <section className="ink">
        <div className="wrap page-head">
          <p className="label muted">Free to play · no prizes, no money</p>
          <h1 className="display">Fan Zone</h1>
          <p className="lead muted">Pick the winner of every Season 3 match before it starts. 10 points per correct pick.</p>
        </div>
      </section>
      <section className="bone section">
        <div className="wrap lv-grid">
          <div>
            <div className="sec-head"><h2 className="display">Make your picks</h2><p className="aside muted">Tap a match to predict</p></div>
            <FixtureList fixtures={upcomingFixtures().slice(0, 10)} />
          </div>
          <aside>
            <div className="sec-head"><h2 className="display">Leaderboard</h2></div>
            <Leaderboard />
            <p className="caption">Points count once the match result is confirmed. Names are chosen by players; report abuse to the site editor.</p>
          </aside>
        </div>
      </section>
    </>
  );
}
