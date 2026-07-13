-- Harden multi-tenant isolation for players + teams
-- Run in Supabase SQL Editor after 01/02 scripts.

-- Force RLS (even for table owner / bypass edge cases)
alter table if exists public.players enable row level security;
alter table if exists public.players force row level security;
alter table if exists public.teams enable row level security;
alter table if exists public.teams force row level security;

-- Revoke broad anon access (authenticated + RLS only)
revoke all on table public.players from anon;
revoke all on table public.teams from anon;
grant select, insert, update, delete on table public.players to authenticated;
grant select, insert, update, delete on table public.teams to authenticated;

-- Recreate players policies (scoped to authenticated + WITH CHECK on update)
drop policy if exists "Allow users to view their own players" on public.players;
drop policy if exists "Allow users to insert their own players" on public.players;
drop policy if exists "Allow users to update their own players" on public.players;
drop policy if exists "Allow users to delete their own players" on public.players;

create policy "players_select_own"
  on public.players for select
  to authenticated
  using (auth.uid() = user_id);

create policy "players_insert_own"
  on public.players for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "players_update_own"
  on public.players for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "players_delete_own"
  on public.players for delete
  to authenticated
  using (auth.uid() = user_id);

-- Recreate teams policies
drop policy if exists "Allow users to view their own teams" on public.teams;
drop policy if exists "Allow users to insert their own teams" on public.teams;
drop policy if exists "Allow users to update their own teams" on public.teams;
drop policy if exists "Allow users to delete their own teams" on public.teams;

create policy "teams_select_own"
  on public.teams for select
  to authenticated
  using (auth.uid() = user_id);

create policy "teams_insert_own"
  on public.teams for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "teams_update_own"
  on public.teams for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "teams_delete_own"
  on public.teams for delete
  to authenticated
  using (auth.uid() = user_id);

-- Helpful indexes
create index if not exists players_user_id_idx on public.players(user_id);
create index if not exists teams_user_id_idx on public.teams(user_id);
