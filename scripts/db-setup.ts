/**
 * One-command Supabase setup.
 *
 *   npx tsx scripts/db-setup.ts [admin-email]
 *
 * Reads from apps/web/.env.local (never from the command line or chat):
 *   SUPABASE_DB_URL        Postgres connection string, for running migrations
 *   SUPABASE_ACCESS_TOKEN  Personal access token, for switching on anonymous sign-ins
 *
 * 1. Runs every file in supabase/migrations/ in order (they are idempotent).
 * 2. Turns on anonymous sign-ins for fan predictions.
 * 3. If an email is given and that user exists, makes them a scorer (admin).
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const env = Object.fromEntries(
  readFileSync("apps/web/.env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trimStart().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL!).hostname.split(".")[0]!;
const email = process.argv[2];

async function main() {
  if (!env.SUPABASE_DB_URL) throw new Error("SUPABASE_DB_URL missing in apps/web/.env.local");
  // Split by hand (password = everything up to the last "@") so unencoded special characters still work.
  const m = env.SUPABASE_DB_URL.match(/^postgres(?:ql)?:\/\/([^:]+):(.*)@([^@/:]+):(\d+)\/([^?]+)/);
  if (!m) throw new Error("SUPABASE_DB_URL is not in postgresql://user:password@host:port/db form");
  const [, user, rawPassword, host, port, database] = m;
  let password = rawPassword!;
  try {
    password = decodeURIComponent(password);
  } catch {
    /* not percent-encoded: use as typed */
  }
  const client = new pg.Client({ user, password, host, port: Number(port), database, ssl: { rejectUnauthorized: false } });
  await client.connect();

  for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) {
    process.stdout.write(`Running ${f} … `);
    await client.query(readFileSync(path.join("supabase/migrations", f), "utf8"));
    console.log("ok");
  }

  const { rows } = await client.query("select count(*)::int as n from public.fixtures");
  console.log(`Fixtures in database: ${rows[0].n}`);

  if (email) {
    const r = await client.query(
      "insert into public.admins (user_id) select id from auth.users where lower(email) = lower($1) on conflict do nothing returning user_id",
      [email],
    );
    const exists = await client.query("select 1 from auth.users where lower(email) = lower($1)", [email]);
    console.log(exists.rowCount ? `Scorer access: ${email} ${r.rowCount ? "added" : "already set"}` : `No user ${email} yet: create it in Authentication → Users, then re-run.`);
  }
  await client.end();

  if (env.SUPABASE_ACCESS_TOKEN) {
    const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/config/auth`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${env.SUPABASE_ACCESS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ external_anonymous_users_enabled: true }),
    });
    console.log(res.ok ? "Anonymous sign-ins: on" : `Could not switch on anonymous sign-ins (HTTP ${res.status}); toggle it in the dashboard.`);
  } else {
    console.log("SUPABASE_ACCESS_TOKEN not set: switch on anonymous sign-ins in the dashboard.");
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
