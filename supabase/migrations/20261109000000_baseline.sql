-- Baseline: the production schema as built by the old hand-run scripts/01–06.
-- Production already has all of this. There, mark this migration as applied
-- (`supabase migration repair --status applied 20261109000000`) instead of
-- running it. On fresh databases (local, CI, staging) it runs normally.

-- ---------------------------------------------------------------------------
-- players: one row per Jogador, owned by the signed-in user
-- ---------------------------------------------------------------------------
create table if not exists public.players (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  image_url text,
  position text not null,
  nationality text not null default 'BR',
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

-- ---------------------------------------------------------------------------
-- teams: created early on and never used by the app (dropped in a later slice)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Tenant isolation: authenticated + RLS only, forced even for the table owner
-- ---------------------------------------------------------------------------
alter table public.players enable row level security;
alter table public.players force row level security;
alter table public.teams enable row level security;
alter table public.teams force row level security;

revoke all on table public.players from anon;
revoke all on table public.teams from anon;
grant select, insert, update, delete on table public.players to authenticated;
grant select, insert, update, delete on table public.teams to authenticated;

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
