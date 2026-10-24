# NPL Season 3 Platform — P0 Blueprint

Status: **draft, awaiting approval** · Written 2026-10-24 (first match 2026-10-26)
State checked: `D:\NPL` is empty; `github.com/hitrog469-cmyk/NPL-Website` has no commits yet.

**Decisions from Rohit (2026-10-24):**
- Brand: placeholder wordmark "NPL Data Desk", renamed later in one config file
- Fixtures: Rohit supplies the official sheet; converted, then approved before going live
- P0 data: versioned JSON in GitHub; Supabase + Drizzle come with the live scorer in P1
- Language: English first, Nepali for nav and key labels, reviewed by Rohit before publishing

---

## 1. The product in one paragraph

An independent NPL data broadcaster built on one auditable delivery-event engine. **The Arena** is the public face: a scoreboard-first homepage, match centre, table, teams, players and records, styled like a broadcast graphics package printed on newsprint — big tabular numerals, hairline rules, one team colour at a time. **The Lab** sits on the same ball-level data and lets analysts drag through matches, compare duels and test chase arithmetic, with every number linked back to the deliveries it came from. **The Studio** is the private control room that turns those same verified numbers into preview/review kits, PNG/MP4 exports and OBS overlays, so a match video is assembled from data rather than rebuilt by hand. One source of truth, three surfaces, no invented facts.

## 2. Five signature experiences (ranked)

| # | Experience | Wow | Use | Feasible now | Why this rank |
|---|---|---|---|---|---|
| 1 | **Match Rewind** — scrub any delivery, whole scorecard reverts | 5 | 5 | 4 | Works on all 64-ish Cricsheet NPL matches on day one; no tagging needed |
| 2 | **Over DNA tapestry** — six-ball glyphs, season at a glance | 5 | 4 | 5 | Pure ball-by-ball; cheap SVG; great creator export |
| 3 | **Chase Chamber** — runs-needed × balls-left surface + hypothetical next-over panel | 4 | 5 | 4 | Arithmetic only, no model needed; model layer added later |
| 4 | **Last-Over Machine** — play out a final over yourself, beside the real finish | 4 | 3 | 5 | Reuses scoring engine; clearly labelled FAN SCENARIO |
| 5 | **Duel Studio** — batter × bowler delivery ribbon | 3 | 5 | 4 | Small NPL samples → must show sample warnings prominently |

Boundary Atlas is excluded from the top five for now: Cricsheet has no shot direction, so it only works after we hand-tag Season 3.

## 3. First-match launch (P0)

**Can ship for 26 Oct (vertical slice, results-level):**
- Public shell + homepage in pre-season and match-day states (no live ball-by-ball yet)
- Fixtures/results list and match page (result + scorecard when entered)
- Points table computed from entered results, labelled provisional until playing conditions are confirmed
- Team pages (S3 fixtures + S1/S2 history from Cricsheet)
- NPL historical leaders & records from Cricsheet with coverage line ("based on N matches, dd Mon yyyy – dd Mon yyyy")
- Independence notice + ODC-BY attribution on data pages
- EN first, NE for nav/labels where you approve the wording

**Ships right after (P0.5, still before mid-league):**
- 4 export templates (preview, result, table, top performers) at 1920×1080 and 1080×1920 via Playwright
- Basic player pages, admin result editing UI, feature flags UI

**Must wait (P1+):** live scorer, realtime match centre, OBS overlays, Rewind, Lab, models, fan zone, Remotion.

**Genuinely blocked on you:**
- Official fixture sheet (no fixtures page without it — I won't copy a third-party schedule)
- NPL S3 playing conditions for points/NRR/tie-break (otherwise table is "provisional")
- Brand name (header, exports, OG images)
- Verified team colours (otherwise neutral typographic treatment)
- Supabase project (only if we use a DB in P0 — see question 3)

## 4. Top 10 design decisions

1. **Scoreboard, not hero.** The homepage opens on a full-width score/confrontation strip; no marketing headline.
2. **Two-surface palette:** near-black `#0B0B0C` broadcast surface and bone `#F2EEE6` editorial surface, alternated by section — gives rhythm without gradients.
3. **One accent at a time:** UI chrome stays neutral; the only saturated colour on a page is the match's team colour (or brand accent when no match).
4. **Type does the work:** Big Shoulders Display for numerals/headlines, Inter Tight body, Anek Devanagari for Nepali; tabular figures everywhere; scores set at 8–14vw.
5. **Hairlines and clipped corners** instead of cards with rounded borders and shadows; 1px rules, 45° clipped rectangles as the brand shape.
6. **Micro-labels** (11px caps, tracked) on every number stating what it is and its source state (`FINAL`, `PROVISIONAL`, `HISTORICAL · CRICSHEET`).
7. **Asymmetric 12-col grid:** primary content 8 cols, caption rail 4 cols; the rail carries context, sources and definitions.
8. **Motion = scoreboard mechanics:** `ScoreTick` digit flips, `WipeTransition` hard horizontal wipes, `LineTrace` chart draws, `StatReveal` masked type; ≤300ms, no easing bounce, reduced-motion off-switch.
9. **No stock imagery:** without licensed photos, players are rendered as typographic plates (name, role, season numbers) — designed so photos are optional, not missing.
10. **Bilingual by design, not translation:** each label has EN and NE strings reviewed by you; layouts are tested with longer Devanagari strings rather than assuming equal width.

## 5. System architecture

```
Cricsheet zip ──► scripts/import-cricsheet ──► canonical events (JSON in repo for P0 / Postgres from P1)
Official fixtures CSV ─► admin import ─┐                         │
Admin result entry ────────────────────┴──► cricket-core (pure TS) ──► aggregates (table, leaders, records)
P1: live scorer PWA ─► append-only DeliveryEvents ─┘                   │
                                                                       ├─► Next.js pages (SSG/ISR on Vercel)
                                                                       ├─► graphics (Playwright PNG, local)
                                                                       ├─► overlays (/overlay/*, Supabase Realtime)
                                                                       └─► motion (Remotion, local render)
```

- **cricket-core** is a pure, dependency-free TypeScript package: delivery events in → innings/scorecard/standings out. Every surface calls it; nothing computes cricket in components.
- **Scoring is event-sourced:** append-only events, state = fold(events). Undo = compensating event. Snapshots are caches, rebuildable.
- **Rendering:** public pages statically generated, revalidated on data change. PNG export via local Playwright script (Devanagari shaping proof required; no Satori). Video via Remotion CLI locally.
- **Hosting cost:** Vercel Hobby + Supabase free tier for now; GitHub for code and P0 data. No paid queues.
- **Backups:** P0 data lives in git (versioned by definition). From P1: nightly `pg_dump` via GitHub Action to a private artifact, plus a documented restore drill.

**P0 data recommendation:** keep canonical data as versioned JSON files in the repo for launch weekend. Entering a result = editing `data/s3/results/*.json` (or a small admin form that commits it) → Vercel redeploys in ~1 min. This gives audit history for free and has zero DB risk. Supabase + Drizzle arrive with the live scorer in P1, importing the same JSON.

**ORM choice: Drizzle.** SQL-shaped schema, no query engine binary, works cleanly with Supabase RLS and serverless; Prisma's strengths (migrations UX, studio) matter less than predictable SQL here.

## 6. Database proposal (P1 target; P0 JSON mirrors these shapes)

```
Season 1─* Fixture 1─0..1 Match 1─* Innings 1─* DeliveryEvent *─1 Player
Team 1─* TeamSeason *─1 Season              │            └─0..1 WicketEvent
Player 1─* PlayerAlias                      ├─* MatchRevision
Player 1─* PlayerTeamHistory                └─* ScoreSnapshot (cache)
SourceImport 1─* SourceFile ──► DataProvenance (polymorphic: entity_type, entity_id)
StandingsRule *─1 Season ; Standings (materialised, rebuildable)
```

Key points:
- `delivery_event`: PK `id uuid`; unique `(innings_id, seq)` where `seq` is integer order of every delivery incl. extras; `legal_ball_index` integer nullable for wides/no-balls; `over_index`, `ball_in_over` derived, never floats. Columns for `runs_bat`, `extras_type`, `extras_runs`, `penalty_runs`, `is_boundary`, `boundary_kind`, `striker_id`, `non_striker_id`, `bowler_id`.
- Every fact row carries `source_kind` enum (`official_confirmed | admin_reported | provisional_live | historical_imported | model_estimated | hypothetical | unavailable`), `source_id`, `source_revision`, `recorded_at`, `verified_at`.
- `player`: own UUID + `cricsheet_registry_id` unique nullable. Never matched by name.
- Corrections: `delivery_revision` rows (old/new JSON, reason, actor); originals never deleted.
- Indexes: `(match_id)`, `(bowler_id)`, `(striker_id)` on deliveries; `(season_id, starts_at_utc)` on fixtures.
- Immutable: imports, delivery events, revisions, audit log. Derived/cached: snapshots, standings, aggregates.

## 7. Route tree & repo tree

```
app/
  page.tsx                         /           home (pre-season | match-day)
  matches/page.tsx                 /matches
  matches/[matchId]/page.tsx       /matches/:id
  table/page.tsx                   /table
  teams/[slug]/page.tsx            /teams/:slug
  players/[slug]/page.tsx          /players/:slug       (P0.5)
  records/page.tsx                 /records
  about/ methodology/ data-sources/
  studio/(auth)/...                /studio/*            (P0.5, auth-gated)
  render/[template]/page.tsx       export canvases for Playwright (not linked)
  overlay/...                      (P1)
  lab/... rewind/...               (flagged off)
```

```
/apps/web
/packages/cricket-core     scoring fold, standings, NRR, aggregates + tests
/packages/data             cricsheet parser, registry mapping, loaders
/packages/ui               tokens, primitives (ScoreStrip, StatTower, CaptionRail…)
/packages/i18n             en.json, ne.json, numeral formatting
/data                      cricsheet raw (gitignored) + canonical/ + s3/fixtures, results
/scripts                   import-cricsheet, verify-stats, render-graphics
/docs                      this blueprint, source policy, match-day runbook
/tests/fixtures            hand-worked edge-case innings
IMPLEMENTATION_STATUS.md
```
pnpm workspaces, no Turborepo until build time warrants it.

## 8. Data correctness plan

Most dangerous cases, each gets a hand-worked fixture test:
1. Wide that goes for 4 byes → 5 wides to bowler, 0 balls faced, not a legal ball.
2. No-ball hit for 6 → batter +6 and +1 ball faced, bowler +7, not a legal ball, next ball free hit.
3. Two wides then a no-ball at the same legal-ball index → three events, unique `seq`, over still needs 6 legal.
4. Leg-byes/byes → team runs, not bowler runs, ball faced by batter.
5. Non-boundary 4 (run four) vs boundary 4 → `is_boundary` distinguishes; affects boundary stats.
6. Run-out on a no-ball, runs completed before dismissal.
7. Strike after a caught dismissal under current MCC law (new batter on strike unless over ends).
8. Retired hurt (not out, can return) vs retired out (wicket, not bowler's).
9. All-out NRR: team bowled out counts full quota of overs (where playing conditions say so).
10. Reduced-overs / DLS target and no-result → match flagged `requires_review` unless revised target is entered.
11. Duplicate Cricsheet import → idempotent by file checksum; counts unchanged.
12. Super Over → separate innings type, excluded from batting/bowling career aggregates.

Invariants (property tests): sum of batter runs + extras = team total; sum of bowler conceded + byes + leg-byes + penalties = team total; legal balls ≤ 6 × overs limit; wickets ≤ 10; total wickets = sum of dismissals; standings points sum = 2 × completed matches + NR/tie points.
Reconciliation check: our scorecard totals vs Cricsheet's per-innings totals for every imported match.

## 9. Blockers & rights

- Official NPL marks/logos: not used. Team names as plain text only.
- Team colours: neutral until you supply verified values.
- Photos/video/music: none assumed.
- Cricsheet ODC-BY: attribution + licence link in footer and on every exported stat graphic.
- Nepali copy: you review; I won't publish machine translation as final.
- Fixtures: from your approved sheet only.

## 10. Milestone 1 — definition of done

**Slice:** Cricsheet NPL import → cricket-core aggregates → Records page + Table page + Home pre-season state, deployed on Vercel.

Done when:
- `pnpm import:cricsheet` downloads the NPL archive, logs match count, checksums, and writes canonical JSON; re-running changes nothing.
- `pnpm test` passes cricket-core edge-case suite (§8) and reconciliation for every imported match.
- `/records` shows most runs, most wickets, highest score, best figures, with coverage line and "view matches" links.
- `/table` renders from fixtures/results JSON (empty state if no results yet).
- `/` renders pre-season state with next fixture (or "fixtures pending approval" state).
- Screenshots captured at 375, 768, 1440 for `/`, `/records`, `/table`; stored in `docs/screenshots/m1/`.
- Lighthouse mobile run recorded (numbers reported, not claimed).
- `IMPLEMENTATION_STATUS.md` updated; pushed to GitHub; Vercel URL live.
