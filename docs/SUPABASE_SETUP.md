# Supabase setup

Project: `mefiljkfaqumhsfxkegp` · URL `https://mefiljkfaqumhsfxkegp.supabase.co` · region Mumbai.

We use Supabase's **new API keys** (`sb_publishable_…` / `sb_secret_…`). The legacy JWT `anon` / `service_role` keys are not used and should be disabled.

## Keys

| Key | Where it goes | Public? |
| --- | --- | --- |
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` | yes |
| Publishable key `sb_publishable_…` | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | yes |
| Secret key `sb_secret_…` | `SUPABASE_SECRET_KEY` | **never**: not in chat, GitHub, screenshots or the browser |

## If a secret key is ever exposed
1. Dashboard → **Project Settings → API Keys → Secret keys** → **+ New secret key**, name it `vercel`.
2. Put the new key in Vercel and `apps/web/.env.local`.
3. On the old secret key's row → **⋯ → Delete**.
4. Legacy keys: same page → **Legacy API Keys** tab → **Disable JWT-based API keys**. This kills the old `anon` and `service_role` keys.

## Vercel environment variables
Vercel → project **npl-website** → **Settings** (top bar) → **Environment Variables** (left menu).
For each row: enter Key and Value, tick **Production** and **Preview**, then **Save**.

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://mefiljkfaqumhsfxkegp.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | your `sb_publishable_…` |
| `SUPABASE_SECRET_KEY` | your new `sb_secret_…`; tick **Sensitive** |

Then **Deployments → latest → ⋯ → Redeploy**, because env vars only apply to new builds.

## Local
`apps/web/.env.local` (gitignored) holds the same three values.

## Database
Tables and security rules ship as SQL files in `supabase/migrations/`. Run each one in Dashboard → **SQL Editor** → paste → **Run**.

## Later: Google sign-in
Authentication → Sign In / Providers → Google. Needs a Google Cloud OAuth client; steps come with the fan zone.
