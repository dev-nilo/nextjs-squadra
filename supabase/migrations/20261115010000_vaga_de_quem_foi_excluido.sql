-- ---------------------------------------------------------------------------
-- A confirmed Jogador who is deleted frees their vaga for the lista de espera.
--
-- Deleting a Jogador deletes their presences (presencas.jogador_id is
-- on delete cascade, 20261110234500_partidas.sql). Until now nothing promoted
-- anyone when that row was confirmado: the vaga stayed free, and the next
-- person to say "vou" took it ahead of everyone already waiting. That broke
-- the first-in, first-out lista de espera.
--
-- After the presence row goes, this takes the Partida's row lock (the one
-- responder_presenca takes) and promotes the first in line. Only while the
-- Partida is still open: once it started, the list is what happened, and a
-- cancelled one takes no more answers. When the Partida itself is being
-- deleted, its row is already gone, so there is nothing to lock or promote.
-- A presence changed by responder_presenca is an update, never a delete, so
-- this doesn't fire for "não vou".
-- ---------------------------------------------------------------------------

create function public.presencas_promove_ao_excluir()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  alvo public.partidas;
begin
  if old.situacao <> 'confirmado' then
    return null;
  end if;

  select * into alvo from public.partidas p where p.id = old.partida_id for update;
  if alvo.id is null or alvo.cancelada_em is not null or alvo.inicio <= now() then
    return null;
  end if;

  perform public.promover_espera(alvo.id);
  return null;
end;
$$;

create trigger presencas_promove_ao_excluir
  after delete on public.presencas
  for each row execute function public.presencas_promove_ao_excluir();

revoke execute on function public.presencas_promove_ao_excluir() from public, anon, authenticated;
