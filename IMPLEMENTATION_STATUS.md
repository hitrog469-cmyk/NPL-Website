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

## Milestone 2a — Season 3 content (24 Oct)

| Item | Status | Evidence |
| --- | --- | --- |
| 32 fixtures | Done | `data/s3/fixtures.json` from the published schedule (read 24 Oct, approved by Rohit). Each team plays 7, 28 unique pairings. 12:30 PM / 4:30 PM Nepal time stored as UTC |
| Next-match board on home | Done | Both team logos and colours, kick-off in Nepal time, S1/S2 form |
| Team pages `/teams`, `/teams/[slug]` | Done | Logo, colour, squad as listed, S3 fixtures, S1/S2 record, top run-scorers/wicket-takers |
| Logos & colours | Done | 8 logos (one matching set), colours sampled from logos; trademark notice in footer |
| Squads | Partial, unverified | From team sites. Biratnagar lists 6; Kathmandu from a fantasy app. Players in two squads: Shubh Kansakar (KY/JB), Kishore Mahato (LL/JB), Aakash Tripathi (LL/KG), Sachin Bhatta (SR/JB), Aasif Sheikh (LL/JB) |
| Screenshot check | Done | 8 routes × 3 widths on the production build, clean |

## Milestone 2b — live scoring & fans (24 Oct)

| Item | Status | Evidence |
| --- | --- | --- |
| Supabase schema + RLS | Done | `npx tsx scripts/db-setup.ts <email>`: migration ok, 33 fixtures (32 + rehearsal), scorer added |
| Security from the public key | Done | Read fixtures/live state: yes. Write balls or match state: blocked (42501 / 0 rows). Admins table: hidden. Pick for a non-playing team: rejected. Anonymous `is_admin`: false |
| Live engine | Done | 48 tests incl. strike rotation, caught law, undo, tags, chases |
| Realtime on production | Done | `scripts/rehearsal-check.ts https://npl-website-v4qu.vercel.app`, 3 runs: each ball on the public page in 81–189 ms, undo in 286–789 ms, no reload |
| Race fix | Done | Out-of-order reloads could overwrite newer balls; reloads are now sequenced and re-run if a ball arrives mid-load |
| Scorer UI on a phone | Not verified by me | Needs Rohit's login; rehearse at `/studio/scorer/rehearsal` |
| Anonymous sign-ins | On | Enabled by Rohit in the dashboard |
| Not built | — | Super Over scoring, win probability model, quizzes, ads, player photos |

## Milestone 3 — Sports Sathi multi-sport hub (24 Oct)

| Item | Status | Evidence |
| --- | --- | --- |
| Rebrand + nav | Done | Sports Sathi; Home · NPL 2026 (sub-menu) · Cricket · Football · Fan Zone · Data. Featured competition = `SITE.featured` |
| Cricket everywhere | Done | `scripts/derive-cricket.ts`: IPL 1,243 · T20I 3,627 · BBL 662 · PSL 357 · CPL 445 · SA20 130 · ILT20 134 · ODI 2,596 · Tests 896 matches; 2.2 MB summaries |
| Engine fix | Done | Revised-target overs are cricket notation (14.4 = 88 balls); test added. Remaining 35 flags are source 7-ball overs |
| Pages | Done | /cricket, /cricket/[comp] (results, champions, teams, records), 360 scorecards; 520 static pages; no overflow at 375/1440 |
| Daily refresh | Done | Workflow also re-derives all competitions; deterministic (no diff when nothing new) |
| NPL after restructure | Verified | All NPL/live/scorer routes 200 on Vercel; rehearsal page renders Rohit's saved state |
| Football | Waiting | Page ready; needs a football-data.org API key |
| Known polish | Todo | IPL franchise renames show as separate teams; Hundred skipped (5-ball sets) |

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
