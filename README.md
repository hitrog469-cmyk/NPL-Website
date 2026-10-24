# NPL Data Desk

Independent Nepal Premier League statistics and creator platform; not an official league site.

Blueprint: [docs/P0_BLUEPRINT.md](docs/P0_BLUEPRINT.md) · Progress: [IMPLEMENTATION_STATUS.md](IMPLEMENTATION_STATUS.md)

## Layout

```
apps/web               Next.js site (static pages, revalidated hourly)
packages/cricket-core  scoring fold, reconciliation, aggregates, standings (pure TS, no deps)
packages/data          Cricsheet parser, dataset loader, Season 3 fixtures/results loader
data/                  canonical data in git: teams, seasons, Cricsheet raw files, S3 fixtures/results
scripts/               import-cricsheet, verify-stats, screenshots
```

## Setup

Node 22+, npm.

```bash
npm install
npm run dev            # http://localhost:3010
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run import:cricsheet` | Downloads the Cricsheet NPL archive, writes changed files to `data/cricsheet/npl/` and updates `manifest.json` with checksums. Idempotent: a re-run with no upstream change touches nothing. Pass a local zip path to import offline. |
| `npm run verify:stats` | Parses every match, checks scorecard invariants and that our totals equal Cricsheet's. Non-zero exit on any failure. |
| `npm test` | Unit tests (hand-worked edge cases) and integration tests against the real archive. |
| `npm run typecheck` | TypeScript across all packages. |
| `npm run build` | Production build. Fails if any data file is invalid. |
| `npm run screenshots -- [baseUrl]` | Full-page captures at 375/768/1440 into `docs/screenshots/m1/`, failing on horizontal overflow, page errors or non-200 routes. Needs `npx playwright install chromium` once. |

## Entering a Season 3 result

Add one file per match to `data/s3/results/`, e.g. `s3-m01.json`:

```json
{
  "matchId": "s3-m01",
  "status": "final",
  "source": "admin_reported",
  "enteredAt": "2026-10-26T15:10:00Z",
  "teams": ["janakpur-bolts", "chitwan-rhinos"],
  "outcome": { "type": "win", "winner": "janakpur-bolts", "by": { "runs": 12 }, "method": null },
  "innings": [
    { "team": "janakpur-bolts", "runs": 172, "wickets": 6, "legalBalls": 120, "allOut": false, "oversLimit": 20 },
    { "team": "chitwan-rhinos", "runs": 160, "wickets": 9, "legalBalls": 120, "allOut": false, "oversLimit": 20 }
  ]
}
```

- `legalBalls` is an integer: 19.3 overs = 117. Never write overs as a decimal.
- `allOut: true` makes NRR count the full `oversLimit`.
- Outcome types: `win`, `tie` (with `superOverWinner`), `no-result`, `abandoned`, `requires-review`.
- Change `source` to `official_confirmed` once checked against the official scorecard.

Commit and push; Vercel rebuilds in about a minute. If the file is invalid the build fails and the live site keeps the previous version.

Team ids are in `data/teams.json`.

## Deploying (Vercel)

- Import the GitHub repo, set **Root Directory** to `apps/web`, framework Next.js.
- Keep "Include files outside the root directory in the Build Step" enabled (pages read `/data` and `/packages` at build).
- No environment variables needed yet.

## Data licence

Cricsheet data © Cricsheet, used under the [Open Data Commons Attribution License v1.0](https://opendatacommons.org/licenses/by/1-0/). The licence text ships in `data/cricsheet/npl/LICENSE.txt`.
