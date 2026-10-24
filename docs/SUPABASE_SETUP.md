# Supabase setup (10 minutes)

Supabase is the database behind predictions, quizzes, fan votes, sign-in and live scoring. The free plan is enough to start.

## 1. Create the project
1. Go to https://supabase.com and sign in with GitHub.
2. **New project**:
   - Name: `npl-data-desk`
   - Database password: generate a strong one and save it in your password manager. You won't need to give it to anyone.
   - Region: **South Asia (Mumbai)**, the closest to Nepal.
   - Plan: Free.
3. Wait about 2 minutes while it sets up.

## 2. Copy three values
Open **Project Settings → API Keys** (on some dashboards it's **Settings → API**):
- **Project URL**, e.g. `https://abcd1234.supabase.co`
- **Publishable key** (older dashboards call it `anon` `public`). This one is safe to be public.
- **Secret key** (older dashboards: `service_role`). **Never share this one, including in chat.**

## 3. Put them in Vercel
Vercel → your project → **Settings → Environment Variables**. Add each for Production and Preview:

| Name | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | Secret key |

## 4. Put them on your PC (for local testing)
Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in the same three values. The file is gitignored, so it never reaches GitHub.

## 5. Tell me "Supabase done"
Send me the **Project URL** only. I'll write the database tables and security rules as a migration file for you to run in **SQL Editor** (one paste, one click).

## Later: Google sign-in
When the fan zone is ready we'll turn on Google sign-in under **Authentication → Sign In / Providers → Google**. That needs a Google Cloud OAuth client; I'll walk you through it at that point.
