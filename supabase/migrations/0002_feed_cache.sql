-- NPL Data Desk · migration 0002: last-good copy of external feed responses.
-- Written and read only by the server with the secret key (no policies on
-- purpose), so a flaky feed shows the latest real data instead of "unavailable".
create table if not exists public.feed_cache (
  key text primary key,
  payload jsonb not null,
  fetched_at timestamptz not null default now()
);
alter table public.feed_cache enable row level security;
