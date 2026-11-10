-- Baseline: the production schema exactly as it was before migrations existed.
--
-- Production was built by hand from the old scripts/01 and 02 only: the later
-- scripts (nationality column, storage policies, tenant hardening) never ran
-- there. `supabase db diff` against production confirmed this file matches it.
-- Those missing pieces arrive as a normal migration afterwards
-- (20261110120000_harden_tenant_isolation.sql).
--
-- Production already has all of this. There, the baseline is marked as applied
-- (`supabase migration repair --status applied 20261109000000`, through the
-- "Production baseline" workflow) instead of being run. Fresh databases (local,
-- CI, staging) run it normally.

create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  image_url text,
  position text not null,
  ovr integer not null default 60,
  velocidade integer not null default 60,
  resistencia integer not null default 60,
  chute integer not null default 60,
  posicionamento integer not null default 60,
  defesa integer not null default 60,
  drible integer not null default 60,
  passe integer not null default 60,
  fisico integer not null default 60,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists players_user_id_idx on public.players(user_id);

-- Created early on and never used by the app (dropped in a later slice).
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  player_ids uuid[] not null default '{}',
  average_rating decimal(5, 2) not null default 60,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists teams_user_id_idx on public.teams(user_id);

alter table public.players enable row level security;
alter table public.teams enable row level security;

create policy "Allow users to view their own players" on public.players
  for select using (auth.uid() = user_id);
create policy "Allow users to insert their own players" on public.players
  for insert with check (auth.uid() = user_id);
create policy "Allow users to update their own players" on public.players
  for update using (auth.uid() = user_id);
create policy "Allow users to delete their own players" on public.players
  for delete using (auth.uid() = user_id);

create policy "Allow users to view their own teams" on public.teams
  for select using (auth.uid() = user_id);
create policy "Allow users to insert their own teams" on public.teams
  for insert with check (auth.uid() = user_id);
create policy "Allow users to update their own teams" on public.teams
  for update using (auth.uid() = user_id);
create policy "Allow users to delete their own teams" on public.teams
  for delete using (auth.uid() = user_id);
