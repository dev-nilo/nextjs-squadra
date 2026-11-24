-- ---------------------------------------------------------------------------
-- Realtime stops sending deletes (#83).
--
-- Supabase Realtime checks each inserted or updated row against the
-- subscriber's RLS before sending it, but it can't do that for a delete: the
-- old row is gone, and the event carries only its primary key. partidas,
-- presencas and sorteios are in the supabase_realtime publication, so anyone
-- signed in who subscribed to deletes got the uuids of rows deleted in every
-- Grupo, for example when a Jogador or a whole Grupo was deleted.
--
-- The app never deletes these rows in normal use. "Não vou" is an update
-- (responder_presenca), a Sorteio is replaced by an update, and a cancelled
-- Partida stays. Deletes only come as cascades: a Jogador deleted takes their
-- presences, and a Grupo or Partida deleted takes everything under it. So the
-- publication now sends inserts and updates only.
--
-- One cascade still matters to a page that is open: a Jogador deleted from the
-- Elenco disappears from a Partida's list. The Partida page reloads on any
-- update of its Partida (hooks/use-partida-ao-vivo.ts), so after presences are
-- deleted this touches their Partidas. partidas_confere_vagas stamps
-- updated_at on any update, and partidas_cancelada_e_final (#87) lets that
-- through on a cancelled Partida. When the Partida itself is being deleted its
-- row is already gone, and the update finds nothing.
--
-- The touch skips a Partida that another transaction has locked
-- (skip locked). That one is responder_presenca or a Sorteio function, which
-- writes to the Partida's list and sends its own event, so the page reloads
-- anyway. Waiting for it instead could deadlock: responder_presenca holds the
-- Partida and waits for the Jogador this delete holds (see #108). Partidas
-- are taken in id order.
-- ---------------------------------------------------------------------------

alter publication supabase_realtime set (publish = 'insert, update');

create function public.presencas_avisam_a_partida()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.partidas p
  set updated_at = now()
  where p.id in (
    select l.id from public.partidas l
    where l.id in (select r.partida_id from removidas r)
    order by l.id
    for update skip locked
  );
  return null;
end;
$$;

create trigger presencas_avisam_a_partida
  after delete on public.presencas
  referencing old table as removidas
  for each statement execute function public.presencas_avisam_a_partida();

revoke execute on function public.presencas_avisam_a_partida() from public, anon, authenticated;
