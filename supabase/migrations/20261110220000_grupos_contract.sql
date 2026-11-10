-- Grupo step 5 (contract): remove what only existed for the move from a
-- per-user Elenco to a per-Grupo one. After this, the Grupo's papéis are the
-- only thing that decides who reads and writes Jogadores and their photos.
--
-- Compatible with the deploy before it (step 4): that app reads and writes by
-- grupo_id, always sends grupo_id on insert, never sends user_id on update and
-- uploads photos to {grupo_id}/.

-- ---------------------------------------------------------------------------
-- 1. Per-user policies on players, and the restrictive guards that fenced them
-- ---------------------------------------------------------------------------
drop policy "players_select_own" on public.players;
drop policy "players_insert_own" on public.players;
drop policy "players_update_own" on public.players;
drop policy "players_delete_own" on public.players;

drop policy "players_grupo_proprio_insert" on public.players;
drop policy "players_grupo_proprio_update" on public.players;
drop policy "players_grupo_proprio_select" on public.players;
drop policy "players_grupo_proprio_delete" on public.players;

-- ---------------------------------------------------------------------------
-- 2. The transition: no more filling grupo_id from the author, no backfill
-- ---------------------------------------------------------------------------
drop trigger players_preenche_grupo on public.players;
drop function public.players_preenche_grupo();

-- Same as before minus the backfill: grupo_id is NOT NULL, so there is never a
-- Jogador without a Grupo to move. CREATE OR REPLACE keeps the grants.
create or replace function public.criar_grupo(nome_do_grupo text)
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

  return novo;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. players.user_id is the author, not the owner
-- ---------------------------------------------------------------------------
-- The Grupo owns the Jogador. If its author deletes their account, the
-- Jogador stays in the Grupo with no author instead of disappearing.
alter table public.players alter column user_id drop not null;
alter table public.players drop constraint players_user_id_fkey;
alter table public.players
  add constraint players_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- Nobody rewrites who created a Jogador: every column but user_id (and
-- created_at) can be updated. Inserts still require user_id = auth.uid()
-- (players_insert_gestor).
revoke update on table public.players from authenticated;
grant update (
  id, grupo_id, name, image_url, position, nationality, ovr,
  velocidade, resistencia, chute, posicionamento, defesa, drible, passe, fisico,
  updated_at
) on table public.players to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Storage: photos are written under {grupo_id}/ only
-- ---------------------------------------------------------------------------
-- Photos already under {user_id}/ keep loading: the bucket is public and
-- "Public read player images" stays. They can no longer be written there.
drop policy "Users upload own player images" on storage.objects;
drop policy "Users update own player images" on storage.objects;
drop policy "Users delete own player images" on storage.objects;
