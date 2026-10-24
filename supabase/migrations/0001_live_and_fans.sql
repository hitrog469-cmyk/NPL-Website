-- NPL Data Desk · migration 0001: live scoring, fixtures, fan predictions.
-- Run once in Supabase → SQL Editor. Safe to re-run: every statement is idempotent.

-- ---------------------------------------------------------------------------
-- Admins: who may score matches and edit fixtures. No policies on purpose:
-- only the SQL editor / secret key can read or change this table.
-- ---------------------------------------------------------------------------
create table if not exists public.admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.admins enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.admins where user_id = (select auth.uid()));
$$;

create or replace function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Fixtures: mirrored from data/s3/fixtures.json so the database can enforce
-- prediction deadlines. starts_at is UTC.
-- ---------------------------------------------------------------------------
create table if not exists public.fixtures (
  id text primary key,
  starts_at timestamptz not null,
  team_a text,
  team_b text,
  stage text not null,
  match_number int
);
alter table public.fixtures enable row level security;
drop policy if exists "fixtures are public" on public.fixtures;
create policy "fixtures are public" on public.fixtures for select using (true);
drop policy if exists "admins edit fixtures" on public.fixtures;
create policy "admins edit fixtures" on public.fixtures for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- Live match state: status, toss/setup and confirmed result.
-- ---------------------------------------------------------------------------
create table if not exists public.live_matches (
  fixture_id text primary key references public.fixtures(id),
  status text not null default 'scheduled'
    check (status in ('scheduled', 'toss', 'live', 'innings_break', 'delayed', 'completed', 'abandoned', 'no_result')),
  setup jsonb not null default '{}'::jsonb,
  result jsonb,
  note text check (char_length(note) <= 280),
  updated_at timestamptz not null default now(),
  updated_by uuid default auth.uid()
);
alter table public.live_matches enable row level security;
drop policy if exists "live state is public" on public.live_matches;
create policy "live state is public" on public.live_matches for select using (true);
drop policy if exists "admins write live state" on public.live_matches;
create policy "admins write live state" on public.live_matches for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));
drop trigger if exists live_matches_updated on public.live_matches;
create trigger live_matches_updated before update on public.live_matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Ball events: append-only log. Undo is a 'void' event, never a delete.
-- kind: delivery | void | tag (wagon wheel) | ends (set striker/non-striker)
-- ---------------------------------------------------------------------------
create table if not exists public.ball_events (
  id uuid primary key default gen_random_uuid(),
  fixture_id text not null references public.fixtures(id),
  innings smallint not null check (innings between 1 and 4),
  seq integer not null check (seq >= 0),
  kind text not null check (kind in ('delivery', 'void', 'tag', 'ends')),
  payload jsonb not null check (octet_length(payload::text) < 4000),
  created_at timestamptz not null default now(),
  created_by uuid default auth.uid(),
  unique (fixture_id, innings, seq)
);
create index if not exists ball_events_fixture on public.ball_events (fixture_id, innings, seq);
alter table public.ball_events enable row level security;
drop policy if exists "balls are public" on public.ball_events;
create policy "balls are public" on public.ball_events for select using (true);
drop policy if exists "admins append balls" on public.ball_events;
create policy "admins append balls" on public.ball_events for insert to authenticated
  with check ((select public.is_admin()));
-- No update or delete policy: the log cannot be rewritten from the app.

-- ---------------------------------------------------------------------------
-- Fan profiles and predictions. Picks lock at the scheduled start, enforced
-- by the database, not the browser.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  display_name text not null check (char_length(btrim(display_name)) between 2 and 24),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "names are public" on public.profiles;
create policy "names are public" on public.profiles for select using (true);
drop policy if exists "own profile insert" on public.profiles;
create policy "own profile insert" on public.profiles for insert to authenticated
  with check (user_id = (select auth.uid()));
drop policy if exists "own profile update" on public.profiles;
create policy "own profile update" on public.profiles for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create table if not exists public.predictions (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  fixture_id text not null references public.fixtures(id),
  winner text not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, fixture_id)
);
alter table public.predictions enable row level security;
drop policy if exists "own picks visible" on public.predictions;
create policy "own picks visible" on public.predictions for select to authenticated
  using (user_id = (select auth.uid()));
drop policy if exists "pick before start" on public.predictions;
create policy "pick before start" on public.predictions for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.fixtures f
                where f.id = fixture_id and now() < f.starts_at and winner in (f.team_a, f.team_b))
  );
drop policy if exists "change pick before start" on public.predictions;
create policy "change pick before start" on public.predictions for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.fixtures f
                where f.id = fixture_id and now() < f.starts_at and winner in (f.team_a, f.team_b))
  );
drop trigger if exists predictions_updated on public.predictions;
create trigger predictions_updated before update on public.predictions
  for each row execute function public.set_updated_at();

-- Public aggregates only; individual picks stay private.
create or replace function public.prediction_split(p_fixture text)
returns table (team text, picks bigint)
language sql stable security definer set search_path = '' as $$
  select winner, count(*) from public.predictions where fixture_id = p_fixture group by winner;
$$;

-- 10 points per correct winner pick, on matches the admin has confirmed.
create or replace function public.leaderboard(p_limit int default 50)
returns table (display_name text, points bigint, correct bigint, picked bigint)
language sql stable security definer set search_path = '' as $$
  select pr.display_name,
         10 * count(*) filter (where p.winner = lm.result->>'winner') as points,
         count(*) filter (where p.winner = lm.result->>'winner') as correct,
         count(*) as picked
  from public.predictions p
  join public.live_matches lm on lm.fixture_id = p.fixture_id and lm.status = 'completed' and lm.fixture_id <> 'rehearsal'
  join public.profiles pr on pr.user_id = p.user_id
  group by pr.user_id, pr.display_name
  order by points desc, correct desc, pr.display_name
  limit least(greatest(p_limit, 1), 200);
$$;

-- ---------------------------------------------------------------------------
-- Grants (RLS above still decides which rows).
-- ---------------------------------------------------------------------------
grant select on public.fixtures, public.live_matches, public.ball_events, public.profiles to anon, authenticated;
grant insert, update on public.live_matches to authenticated;
grant insert on public.ball_events to authenticated;
grant insert, update on public.profiles to authenticated;
grant select, insert, update on public.predictions to authenticated;
grant execute on function public.prediction_split(text), public.leaderboard(int) to anon, authenticated;
revoke execute on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: every new ball is pushed to open live pages.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'ball_events') then
    alter publication supabase_realtime add table public.ball_events;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'live_matches') then
    alter publication supabase_realtime add table public.live_matches;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Season 3 fixtures (generated from data/s3/fixtures.json).
-- ---------------------------------------------------------------------------
insert into public.fixtures (id, starts_at, team_a, team_b, stage, match_number) values
  ('s3-m01', '2026-10-26T10:45:00.000Z', 'lumbini-lions', 'sudurpaschim-royals', 'league', 1),
  ('s3-m02', '2026-10-27T06:45:00.000Z', 'biratnagar-kings', 'chitwan-rhinos', 'league', 2),
  ('s3-m03', '2026-10-27T10:45:00.000Z', 'janakpur-bolts', 'karnali-yaks', 'league', 3),
  ('s3-m04', '2026-10-28T10:45:00.000Z', 'pokhara-avengers', 'sudurpaschim-royals', 'league', 4),
  ('s3-m05', '2026-10-29T06:45:00.000Z', 'janakpur-bolts', 'kathmandu-gorkhas', 'league', 5),
  ('s3-m06', '2026-10-29T10:45:00.000Z', 'biratnagar-kings', 'karnali-yaks', 'league', 6),
  ('s3-m07', '2026-10-31T06:45:00.000Z', 'chitwan-rhinos', 'lumbini-lions', 'league', 7),
  ('s3-m08', '2026-10-31T10:45:00.000Z', 'biratnagar-kings', 'sudurpaschim-royals', 'league', 8),
  ('s3-m09', '2026-11-01T10:45:00.000Z', 'janakpur-bolts', 'pokhara-avengers', 'league', 9),
  ('s3-m10', '2026-11-02T06:45:00.000Z', 'karnali-yaks', 'kathmandu-gorkhas', 'league', 10),
  ('s3-m11', '2026-11-02T10:45:00.000Z', 'chitwan-rhinos', 'sudurpaschim-royals', 'league', 11),
  ('s3-m12', '2026-11-03T06:45:00.000Z', 'biratnagar-kings', 'janakpur-bolts', 'league', 12),
  ('s3-m13', '2026-11-03T10:45:00.000Z', 'lumbini-lions', 'pokhara-avengers', 'league', 13),
  ('s3-m14', '2026-11-05T06:45:00.000Z', 'janakpur-bolts', 'lumbini-lions', 'league', 14),
  ('s3-m15', '2026-11-05T10:45:00.000Z', 'biratnagar-kings', 'kathmandu-gorkhas', 'league', 15),
  ('s3-m16', '2026-11-06T06:45:00.000Z', 'karnali-yaks', 'sudurpaschim-royals', 'league', 16),
  ('s3-m17', '2026-11-06T10:45:00.000Z', 'chitwan-rhinos', 'pokhara-avengers', 'league', 17),
  ('s3-m18', '2026-11-07T10:45:00.000Z', 'kathmandu-gorkhas', 'lumbini-lions', 'league', 18),
  ('s3-m19', '2026-11-09T06:45:00.000Z', 'karnali-yaks', 'pokhara-avengers', 'league', 19),
  ('s3-m20', '2026-11-09T10:45:00.000Z', 'chitwan-rhinos', 'kathmandu-gorkhas', 'league', 20),
  ('s3-m21', '2026-11-10T10:45:00.000Z', 'janakpur-bolts', 'sudurpaschim-royals', 'league', 21),
  ('s3-m22', '2026-11-12T06:45:00.000Z', 'biratnagar-kings', 'pokhara-avengers', 'league', 22),
  ('s3-m23', '2026-11-12T10:45:00.000Z', 'karnali-yaks', 'lumbini-lions', 'league', 23),
  ('s3-m24', '2026-11-13T06:45:00.000Z', 'kathmandu-gorkhas', 'sudurpaschim-royals', 'league', 24),
  ('s3-m25', '2026-11-13T10:45:00.000Z', 'chitwan-rhinos', 'janakpur-bolts', 'league', 25),
  ('s3-m26', '2026-11-14T10:45:00.000Z', 'biratnagar-kings', 'lumbini-lions', 'league', 26),
  ('s3-m27', '2026-11-15T06:45:00.000Z', 'chitwan-rhinos', 'karnali-yaks', 'league', 27),
  ('s3-m28', '2026-11-15T10:45:00.000Z', 'kathmandu-gorkhas', 'pokhara-avengers', 'league', 28),
  ('s3-q1', '2026-11-17T10:45:00.000Z', null, null, 'qualifier-1', null),
  ('s3-el', '2026-11-18T10:45:00.000Z', null, null, 'eliminator', null),
  ('s3-q2', '2026-11-19T10:45:00.000Z', null, null, 'qualifier-2', null),
  ('s3-final', '2026-11-21T10:45:00.000Z', null, null, 'final', null),
  -- Practice match for the scorer; excluded from leaderboard and live banner.
  ('rehearsal', '2030-01-01T10:45:00.000Z', 'lumbini-lions', 'sudurpaschim-royals', 'rehearsal', null)
on conflict (id) do update set starts_at = excluded.starts_at, team_a = excluded.team_a, team_b = excluded.team_b, stage = excluded.stage, match_number = excluded.match_number;

insert into public.live_matches (fixture_id) select id from public.fixtures on conflict do nothing;

-- Wipe the rehearsal match so it can be practised again. Admins only; touches nothing else.
create or replace function public.reset_rehearsal() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then
    raise exception 'admins only';
  end if;
  delete from public.ball_events where fixture_id = 'rehearsal';
  delete from public.predictions where fixture_id = 'rehearsal';
  update public.live_matches set status = 'scheduled', setup = '{}'::jsonb, result = null, note = null where fixture_id = 'rehearsal';
end;
$$;
revoke execute on function public.reset_rehearsal() from public;
grant execute on function public.reset_rehearsal() to authenticated;

-- ---------------------------------------------------------------------------
-- Make yourself the scorer. Create your user first (Authentication → Users →
-- Add user → Create new user, tick Auto Confirm), then run with your email:
--
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;
-- ---------------------------------------------------------------------------
