-- Grupo step 4 (enforce): every Jogador belongs to a Grupo, and the Grupo's
-- papéis decide who reads and writes its Elenco.
--
-- Compatible with the deploy before it (step 3): that app already reads and
-- writes by grupo_id and always sends it on insert.

-- ---------------------------------------------------------------------------
-- 1. Adopt Jogadores that still have no Grupo
-- ---------------------------------------------------------------------------
-- Their authors never reached the first-access screen. Instead of deleting
-- their Elenco, put it in the oldest Grupo they own or, failing that, in a new
-- "Meu fut" with them as dono. They can rename it later.
do $$
declare
  autor uuid;
  destino uuid;
  candidato text;
  sufixo int;
  criados int := 0;
  movidos int;
  total int := 0;
begin
  for autor in select distinct p.user_id from public.players p where p.grupo_id is null loop
    select m.grupo_id into destino
    from public.grupo_membros m
    where m.user_id = autor and m.papel = 'dono'
    order by m.created_at
    limit 1;

    if destino is null then
      candidato := 'meu-fut';
      sufixo := 1;
      loop
        begin
          insert into public.grupos (slug, nome, criado_por)
          values (candidato, 'Meu fut', autor)
          returning id into destino;
          exit;
        exception when unique_violation then
          sufixo := sufixo + 1;
          candidato := 'meu-fut-' || sufixo;
        end;
      end loop;
      insert into public.grupo_membros (grupo_id, user_id, papel) values (destino, autor, 'dono');
      criados := criados + 1;
    end if;

    update public.players set grupo_id = destino where user_id = autor and grupo_id is null;
    get diagnostics movidos = row_count;
    total := total + movidos;
  end loop;

  raise notice 'Adopted % Jogadores without a Grupo, creating % new Grupos', total, criados;
end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Every Jogador has a Grupo
-- ---------------------------------------------------------------------------
alter table public.players alter column grupo_id set not null;

-- ---------------------------------------------------------------------------
-- 3. Role-based access to the Elenco
-- ---------------------------------------------------------------------------
-- Any Membro reads the Grupo's Jogadores; dono and admin create, edit and
-- delete them. A Jogador is always created in the creator's own name.
create policy "players_select_membro" on public.players
  for select to authenticated
  using (public.papel_no_grupo(grupo_id) is not null);

create policy "players_insert_gestor" on public.players
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.papel_no_grupo(grupo_id) in ('dono', 'admin')
  );

create policy "players_update_gestor" on public.players
  for update to authenticated
  using (public.papel_no_grupo(grupo_id) in ('dono', 'admin'))
  with check (public.papel_no_grupo(grupo_id) in ('dono', 'admin'));

create policy "players_delete_gestor" on public.players
  for delete to authenticated
  using (public.papel_no_grupo(grupo_id) in ('dono', 'admin'));

-- The per-user policies (players_*_own) stay until step 5. Restrictive
-- policies keep them from reaching past the papéis meanwhile: insert and update
-- are already covered (players_grupo_proprio_*); these cover reading and
-- deleting, so someone who left a Grupo, or was made membro, can't still read
-- or delete the Jogadores they once created there.
create policy "players_grupo_proprio_select" on public.players
  as restrictive for select to authenticated
  using (public.papel_no_grupo(grupo_id) is not null);

create policy "players_grupo_proprio_delete" on public.players
  as restrictive for delete to authenticated
  using (public.papel_no_grupo(grupo_id) in ('dono', 'admin'));
