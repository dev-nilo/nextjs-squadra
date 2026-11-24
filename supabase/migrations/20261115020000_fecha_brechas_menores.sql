-- ---------------------------------------------------------------------------
-- Closes the small gaps a read-only audit of the final schema found, each
-- one a rule the app kept but the database didn't.
-- ---------------------------------------------------------------------------

-- 1. A Jogador stays in its Grupo. The update grant listed id and grupo_id,
-- so someone who is dono or admin of two Grupos could move a Jogador, with
-- its linked account and its presences, from one to the other (the update
-- policy checks the papel in the old and the new Grupo, and both passed). No
-- screen moves Jogadores, and saves never send either column.
revoke update (id, grupo_id) on table public.players from authenticated;

-- 2. A Convite's token, expiry and author always come from the column
-- defaults: 128 random bits, 7 days, the caller. Insert was granted on every
-- column, so a dono or admin could POST their own token or a far-off expiry.
-- And once cancelled, a link stays cancelled: the update policy let
-- revogado_em go back to null.
revoke insert on table public.convites from authenticated;
grant insert (grupo_id) on table public.convites to authenticated;

drop policy "convites_update_gestor" on public.convites;
create policy "convites_update_gestor" on public.convites
  for update to authenticated
  using (public.papel_no_grupo(grupo_id) in ('dono', 'admin'))
  with check (revogado_em is not null and public.papel_no_grupo(grupo_id) in ('dono', 'admin'));

-- 3. Leaving waits for a handover in flight. passar_posse locks the Grupo's
-- row; sair_do_grupo didn't, so an admin leaving while the dono handed them
-- the fut could read "admin", then delete their row after it had become the
-- dono's: a Grupo with no dono. Now it takes the same lock and checks the
-- papel again after it, when the handover has committed. Same signature, so
-- the grants stay.
create or replace function public.sair_do_grupo(grupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.exigir_papel(grupo);
  perform 1 from public.grupos g where g.id = grupo for update;
  if public.exigir_papel(grupo) = 'dono' then
    raise exception 'Passe o fut pra um admin antes de sair' using hint = 'dono-nao-sai';
  end if;
  perform public.desligar_do_grupo(grupo, (select auth.uid()));
end;
$$;

-- 4. Privileges nothing uses any more. RLS already refused these (no
-- policy), but a privilege that's never needed shouldn't be granted: every
-- change to people and to the fut goes through a function since
-- 20261114000000_pessoas.sql.
revoke delete on table public.grupos from authenticated;
revoke update (nome) on table public.grupos from authenticated;
revoke delete on table public.grupo_membros from authenticated;
revoke truncate, references, trigger on table public.players from authenticated;
revoke execute on function public.calcular_ovr() from public, anon, authenticated;
