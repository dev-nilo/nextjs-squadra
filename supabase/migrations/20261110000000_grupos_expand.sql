-- Grupo, step 1 of 5 (expand). See docs/adr/0003-elenco-belongs-to-a-grupo.md.
--
-- Adds Grupos and their Membros next to the per-user Elenco without changing
-- how the app reads or writes Jogadores yet. The first-access screen (step 2)
-- calls criar_grupo(), which also moves the caller's Jogadores into the new
-- Grupo: the backfill happens one user at a time, not in a migration.

create extension if not exists unaccent with schema extensions;

create type public.papel_grupo as enum ('dono', 'admin', 'membro');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.grupos (
  id uuid primary key default gen_random_uuid(),
  -- URL key (/g/<slug>). Set once at creation: renaming a Grupo keeps its links.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  nome text not null check (char_length(btrim(nome)) between 1 and 60),
  criado_por uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.grupo_membros (
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  papel public.papel_grupo not null default 'membro',
  created_at timestamptz not null default now(),
  primary key (grupo_id, user_id)
);

create index grupo_membros_user_id_idx on public.grupo_membros(user_id);
-- Exactly one dono per Grupo.
create unique index grupo_membros_um_dono_idx on public.grupo_membros(grupo_id) where papel = 'dono';

-- Nullable until step 4. Deleting a Grupo deletes its Elenco.
alter table public.players add column grupo_id uuid references public.grupos(id) on delete cascade;
create index players_grupo_id_idx on public.players(grupo_id);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

-- The caller's papel in a Grupo, or null when they aren't a Membro. Security
-- definer so policies on grupo_membros can call it without recursing into
-- their own RLS.
create function public.papel_no_grupo(alvo uuid)
returns public.papel_grupo
language sql
stable
security definer
set search_path = ''
as $$
  select m.papel
  from public.grupo_membros m
  where m.grupo_id = alvo and m.user_id = (select auth.uid())
$$;

create function public.slug_para(texto text)
returns text
language sql
stable
set search_path = ''
as $$
  select btrim(regexp_replace(lower(extensions.unaccent(texto)), '[^a-z0-9]+', '-', 'g'), '-')
$$;

-- Creates a Grupo with the caller as dono and moves the caller's Jogadores
-- that have no Grupo yet into it. Two Grupos can share a name, so a numeric
-- suffix keeps slugs unique: pelada, pelada-2, pelada-3...
create function public.criar_grupo(nome_do_grupo text)
returns public.grupos
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  limpo text := btrim(coalesce(nome_do_grupo, ''));
  base text;
  candidato text;
  sufixo int := 1;
  novo public.grupos;
begin
  if eu is null then
    raise exception 'criar_grupo requires a signed-in user' using errcode = '28000';
  end if;
  if char_length(limpo) not between 1 and 60 then
    raise exception 'O nome do fut precisa ter entre 1 e 60 caracteres' using errcode = '22023';
  end if;

  base := coalesce(nullif(public.slug_para(limpo), ''), 'fut');
  candidato := base;
  loop
    begin
      insert into public.grupos (slug, nome, criado_por)
      values (candidato, limpo, eu)
      returning * into novo;
      exit;
    exception when unique_violation then
      sufixo := sufixo + 1;
      candidato := base || '-' || sufixo;
    end;
  end loop;

  insert into public.grupo_membros (grupo_id, user_id, papel) values (novo.id, eu, 'dono');

  update public.players set grupo_id = novo.id where user_id = eu and grupo_id is null;

  return novo;
end;
$$;

-- Transition only (dropped in step 5): while the app still inserts Jogadores
-- by user_id, put them in the Grupo the user owns, if any.
create function public.players_preenche_grupo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.grupo_id is null then
    select m.grupo_id into new.grupo_id
    from public.grupo_membros m
    where m.user_id = new.user_id and m.papel = 'dono'
    order by m.created_at
    limit 1;
  end if;
  return new;
end;
$$;

create trigger players_preenche_grupo
  before insert on public.players
  for each row execute function public.players_preenche_grupo();

revoke execute on function public.papel_no_grupo(uuid) from public, anon;
revoke execute on function public.slug_para(text) from public, anon;
revoke execute on function public.criar_grupo(text) from public, anon;
revoke execute on function public.players_preenche_grupo() from public, anon, authenticated;
grant execute on function public.papel_no_grupo(uuid) to authenticated;
grant execute on function public.slug_para(text) to authenticated;
grant execute on function public.criar_grupo(text) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS. Grupos and Membros are only created through functions (criar_grupo now,
-- invites in #24), so authenticated users get no INSERT on either table.
-- ---------------------------------------------------------------------------
alter table public.grupos enable row level security;
alter table public.grupos force row level security;
alter table public.grupo_membros enable row level security;
alter table public.grupo_membros force row level security;

revoke all on table public.grupos from anon, authenticated;
revoke all on table public.grupo_membros from anon, authenticated;
grant select, delete on table public.grupos to authenticated;
grant update (nome) on table public.grupos to authenticated;
grant select, delete on table public.grupo_membros to authenticated;
grant update (papel) on table public.grupo_membros to authenticated;

create policy "grupos_select_membro" on public.grupos
  for select to authenticated
  using (public.papel_no_grupo(id) is not null);

create policy "grupos_update_dono" on public.grupos
  for update to authenticated
  using (public.papel_no_grupo(id) = 'dono')
  with check (public.papel_no_grupo(id) = 'dono');

create policy "grupos_delete_dono" on public.grupos
  for delete to authenticated
  using (public.papel_no_grupo(id) = 'dono');

create policy "grupo_membros_select_membro" on public.grupo_membros
  for select to authenticated
  using (public.papel_no_grupo(grupo_id) is not null);

-- The dono promotes or demotes others between admin and membro. Nobody edits
-- the dono row, and nobody becomes dono this way (ownership transfer is out of scope).
create policy "grupo_membros_update_dono" on public.grupo_membros
  for update to authenticated
  using (public.papel_no_grupo(grupo_id) = 'dono' and papel <> 'dono')
  with check (papel in ('admin', 'membro'));

-- The dono removes others; anyone but the dono can leave.
create policy "grupo_membros_delete" on public.grupo_membros
  for delete to authenticated
  using (
    papel <> 'dono'
    and (public.papel_no_grupo(grupo_id) = 'dono' or user_id = (select auth.uid()))
  );

-- Jogadores keep their per-user policies until step 3. These restrictive
-- policies close the gap meanwhile: a user can only put a Jogador in a Grupo
-- they run (dono or admin), never in someone else's.
create policy "players_grupo_proprio_insert" on public.players
  as restrictive for insert to authenticated
  with check (grupo_id is null or public.papel_no_grupo(grupo_id) in ('dono', 'admin'));

create policy "players_grupo_proprio_update" on public.players
  as restrictive for update to authenticated
  using (true)
  with check (grupo_id is null or public.papel_no_grupo(grupo_id) in ('dono', 'admin'));
