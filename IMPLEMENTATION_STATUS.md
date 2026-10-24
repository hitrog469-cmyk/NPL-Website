# Implementation status

Updated 2026-10-24.

## Milestone 1 — done

Cricsheet import → cricket-core → Records, Table and pre-season Home, plus Matches and match pages.

| Item | Status | Evidence |
| --- | --- | --- |
| Cricsheet import, idempotent | Done | `npm run import:cricsheet`: 64 matches added; second run "Added 0, updated 0, unchanged 64". Archive sha256 `caf53c4a…6c84` |
| Reconciliation, every innings | Done | `npm run verify:stats`: 64 matches (S1 32, S2 32), 193 players, 30 Nov 2024 – 13 Dec 2025, all innings reconcile, 0 parser warnings |
| Scoring edge-case tests | Done | `npm test`: 33 passing (wide+byes, no-ball six, stacked illegal deliveries, byes/leg-byes, penalty, maidens, run four, run out on no-ball, retired hurt/returning, retired out, bowler credit, all-out, over display, NRR all-out quota, chase NRR, ties/Super Over, no result, requires-review, unknown team) |
| Real-data cases | Done | Super Over tie 1462658, non-boundary four 1462642, retired hurt 1511000, Gurkhas/Gorkhas and Sudur Paschim spelling merge |
| `/records` (+ `/records/s1`, `/s2`) | Done | 9 record tables, coverage line, every record links to its match |
| `/table` | Done | S3 empty state, "provisional rules" label; S1/S2 reconstructed tables, labelled not official |
| `/` pre-season | Done | Season board, countdown (Kathmandu date), team rail, both finals, leaders |
| `/matches`, `/matches/[id]` | Done | 64 scorecards, runs-per-over strip, FOW, Super Over block, source id + revision + checksum |
| `/data-sources` | Done | Sources, definitions, known limits, ODC-BY attribution |
| Typecheck / build | Done | `npm run typecheck` clean; `npm run build` produces 75 static pages |
| Screenshots | Done | `docs/screenshots/m1/` — 6 routes × 375/768/1440 from the production build; script checks no horizontal overflow, no page errors, all 200 |
| Vercel deploy | Done | https://npl-website-v4qu.vercel.app — all routes 200, 404 works, security headers present, served from edge cache |
| Live layout check | Done | `npm run screenshots -- https://npl-website-v4qu.vercel.app <dir>`: no overflow, no page errors at 375/768/1440 |
| Lighthouse (mobile, 24 Oct) | Done | Home: perf 99, a11y 100, best-practices 96, SEO 100; LCP 2.1 s, CLS 0, TBT 80 ms. Records 98/100/96/100, match page 97/100/96/100. Lab run from a desktop machine with Lighthouse's simulated mobile throttling, not a real Nepal 4G device. Fixed after the run: missing favicon (the 96) and wordmark accessible name |

## Decisions and deviations

- npm workspaces instead of pnpm (pnpm not installed; nothing depends on it).
- `packages/ui` and `packages/i18n` from the blueprint live inside `apps/web` for now; split out when graphics/overlays need them.
- Display font is Google's "Big Shoulders" (the renamed Big Shoulders Display), OFL, self-hosted by next/font.
- Season 3 window (26 Oct – 21 Nov) and format (28 + 4) are shown as "editor reported" until the official sheet is in.
- Nepali labels are off (`FLAGS.nepaliLabels`) until Rohit reviews the wording.

## Blockers

1. Official Season 3 fixture sheet: `/matches` and the home fixtures rail show a "pending" state until then.
2. NPL Season 3 playing conditions (points, tie, NRR, tie-breakers): table stays "provisional rules".
3. Verified team colours and official spellings: neutral treatment until supplied.

## Next

- Load and approve the fixture sheet → home switches to the next-match confrontation board.
- Admin result entry form (writes the same JSON as `data/s3/results/`).
- 4 export templates (preview, result, table, top performers) at 1920×1080 and 1080×1920 via Playwright.
- Team and player pages (flags exist, off).
