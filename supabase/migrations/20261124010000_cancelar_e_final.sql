-- ---------------------------------------------------------------------------
-- Cancelling a Partida is final (#87).
--
-- Cancelling sets partidas.cancelada_em, and the dono and admins may update that
-- column (grant in 20261110234500_partidas.sql). Nothing stopped them from
-- setting it back to null through the API, or from changing a cancelled
-- Partida's start, place or vagas. More vagas would even promote people from
-- the lista de espera of a game that isn't happening (partidas_promove_depois).
-- No screen does any of this, and CONTEXT.md says a cancelled Partida keeps its
-- list and takes no more answers. The owner decided on 2026-11-24 that there is
-- no reopening: if the game happens after all, it's a new Partida.
--
-- So once cancelada_em is set, the columns people edit are frozen. Other
-- columns (updated_at) may still change, so a trigger can still touch the row.
-- The name sorts before partidas_confere_vagas, so this refusal comes first.
-- ---------------------------------------------------------------------------

create function public.partidas_cancelada_e_final()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.cancelada_em is not null
    and (new.cancelada_em, new.inicio, new.local, new.vagas) is distinct from (old.cancelada_em, old.inicio, old.local, old.vagas)
  then
    raise exception 'Essa Partida foi cancelada' using hint = 'cancelada';
  end if;
  return new;
end;
$$;

create trigger partidas_cancelada_e_final
  before update on public.partidas
  for each row execute function public.partidas_cancelada_e_final();

revoke execute on function public.partidas_cancelada_e_final() from public, anon, authenticated;
