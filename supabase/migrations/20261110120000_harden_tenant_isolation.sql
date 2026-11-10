-- Brings production up to what the old scripts/03–06 described but never applied
-- there (the baseline diff showed they were missing):
--   - players.nationality, which the app already writes and falls back without
--   - forced RLS, no table access for anon, and per-user policies limited to
--     authenticated users, with WITH CHECK on update
--   - the player-images bucket and its storage policies, scoped to {user_id}/...
--
-- Idempotent on purpose: databases that already have some of this (staging was
-- first built from the old, hardened baseline) end up in the same state.

-- ---------------------------------------------------------------------------
-- Nationality: existing Jogadores become BR, the app's default.
-- ---------------------------------------------------------------------------
alter table public.players add column if not exists nationality text not null default 'BR';

-- ---------------------------------------------------------------------------
-- Tenant isolation
-- ---------------------------------------------------------------------------
alter table public.players force row level security;
alter table public.teams force row level security;

revoke all on table public.players from anon;
revoke all on table public.teams from anon;
grant select, insert, update, delete on table public.players to authenticated;
grant select, insert, update, delete on table public.teams to authenticated;

drop policy if exists "Allow users to view their own players" on public.players;
drop policy if exists "Allow users to insert their own players" on public.players;
drop policy if exists "Allow users to update their own players" on public.players;
drop policy if exists "Allow users to delete their own players" on public.players;
drop policy if exists "Allow users to view their own teams" on public.teams;
drop policy if exists "Allow users to insert their own teams" on public.teams;
drop policy if exists "Allow users to update their own teams" on public.teams;
drop policy if exists "Allow users to delete their own teams" on public.teams;

drop policy if exists "players_select_own" on public.players;
drop policy if exists "players_insert_own" on public.players;
drop policy if exists "players_update_own" on public.players;
drop policy if exists "players_delete_own" on public.players;
drop policy if exists "teams_select_own" on public.teams;
drop policy if exists "teams_insert_own" on public.teams;
drop policy if exists "teams_update_own" on public.teams;
drop policy if exists "teams_delete_own" on public.teams;

create policy "players_select_own" on public.players
  for select to authenticated using (auth.uid() = user_id);
create policy "players_insert_own" on public.players
  for insert to authenticated with check (auth.uid() = user_id);
create policy "players_update_own" on public.players
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "players_delete_own" on public.players
  for delete to authenticated using (auth.uid() = user_id);

create policy "teams_select_own" on public.teams
  for select to authenticated using (auth.uid() = user_id);
create policy "teams_insert_own" on public.teams
  for insert to authenticated with check (auth.uid() = user_id);
create policy "teams_update_own" on public.teams
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "teams_delete_own" on public.teams
  for delete to authenticated using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: public bucket for player photos, writes scoped to {user_id}/...
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-images',
  'player-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Public read player images" on storage.objects;
drop policy if exists "Users upload own player images" on storage.objects;
drop policy if exists "Users update own player images" on storage.objects;
drop policy if exists "Users delete own player images" on storage.objects;

create policy "Public read player images" on storage.objects
  for select using (bucket_id = 'player-images');

create policy "Users upload own player images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'player-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users update own player images" on storage.objects
  for update to authenticated
  using (bucket_id = 'player-images' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'player-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "Users delete own player images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'player-images' and (storage.foldername(name))[1] = auth.uid()::text);
