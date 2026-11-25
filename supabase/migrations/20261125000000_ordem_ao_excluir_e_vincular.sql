-- Two lock-order gaps found in the review of #107.
--
-- #109: vincular_jogador and criar_meu_jogador asked whether the caller is in
-- the Grupo without taking its lock. remover_do_grupo (and sair_do_grupo) hold
-- the grupos row while they unlink the person's Jogador and delete their
-- membership, so a link made during that transaction landed after the unlink:
-- the Jogador ended up linked to someone no longer in the fut. Both now take
-- the grupos row first, shared (they don't change the Grupo, and two links
-- don't need to wait for each other), and check membership again after it.
-- Same order as every people function: grupos, then players.
--
-- #108: deleting a Jogador locked their players row, the cascade deleted their
-- presences, and presencas_promove_ao_excluir then locked each Partida where
-- they were confirmed. responder_presenca takes the Partida first and the
-- Jogador after (the foreign key check of its upsert), so the two could hold
-- one lock each and deadlock (40P01). excluir_grupo's cascade had the same
-- order. Now:
--   * excluir_jogador deletes a Jogador. It takes a lock of that Jogador's own
--     (a transaction advisory lock), then the Partidas the Jogador is in, in id
--     order, and only then deletes. The trigger finds its Partidas already
--     locked by this transaction.
--   * responder_presenca takes the same Jogador lock, shared, before the
--     Partida. While excluir_jogador holds it no answer for that Jogador is
--     running or can start, so the set of Partidas it locked can't grow before
--     the delete.
--   * excluir_grupo locks every Partida of the fut, in id order, before its
--     delete reaches the Jogadores. New Partidas can't appear meanwhile: their
--     insert needs a key share on the grupos row, which it holds.
-- The direct DELETE on players stays granted until the app has moved to
-- excluir_jogador (expand, then contract in the next migration).

-- vincular_jogador
CREATE OR REPLACE FUNCTION public.vincular_jogador(jogador uuid)
 RETURNS public.players
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  eu uuid := (select auth.uid());
  fut uuid;
  alvo public.players;
begin
  if eu is null then
    raise exception 'vincular_jogador requires a signed-in user' using errcode = '28000';
  end if;

  -- The Grupo's row first, shared: removing someone holds it, so a link can't
  -- land in the middle of that person's removal (#109).
  select p.grupo_id into fut from public.players p
  where p.id = jogador and public.papel_no_grupo(p.grupo_id) is not null;
  if fut is null then
    raise exception 'Jogador não encontrado' using hint = 'nao-membro';
  end if;
  perform 1 from public.grupos g where g.id = fut for share;

  -- Lock the row so two people can't claim the same Jogador at once, and
  -- check membership again: the caller may have been removed meanwhile.
  select * into alvo from public.players p
  where p.id = jogador and p.grupo_id = fut and public.papel_no_grupo(p.grupo_id) is not null
  for update;
  if alvo.id is null or public.papel_no_grupo(alvo.grupo_id) is null then
    raise exception 'Jogador não encontrado' using hint = 'nao-membro';
  end if;
  if alvo.conta_id = eu then
    return alvo;
  end if;
  if alvo.conta_id is not null then
    raise exception 'Esse Jogador já é de outra pessoa' using hint = 'ja-vinculado';
  end if;
  if exists (select 1 from public.players p where p.grupo_id = alvo.grupo_id and p.conta_id = eu) then
    raise exception 'Você já tem um Jogador nesse fut' using hint = 'ja-tem-jogador';
  end if;

  update public.players set conta_id = eu, updated_at = now() where id = alvo.id returning * into alvo;
  return alvo;
end;
$function$;

-- criar_meu_jogador
CREATE OR REPLACE FUNCTION public.criar_meu_jogador(grupo uuid, nome text, posicao text)
 RETURNS public.players
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  eu uuid := (select auth.uid());
  limpo text := btrim(coalesce(nome, ''));
  novo public.players;
begin
  if eu is null then
    raise exception 'criar_meu_jogador requires a signed-in user' using errcode = '28000';
  end if;
  if public.papel_no_grupo(grupo) is null then
    raise exception 'Fut não encontrado' using hint = 'nao-membro';
  end if;
  if char_length(limpo) not between 1 and 40 then
    raise exception 'O nome precisa ter entre 1 e 40 caracteres' using errcode = '22023';
  end if;
  if posicao is null or posicao not in ('GOL', 'FIX', 'ALA', 'ATA') then
    raise exception 'Posição inválida' using errcode = '22023';
  end if;

  -- The Grupo's row first, shared, then a member again (see vincular_jogador).
  perform 1 from public.grupos g where g.id = grupo and public.papel_no_grupo(g.id) is not null for share;
  if public.papel_no_grupo(grupo) is null then
    raise exception 'Fut não encontrado' using hint = 'nao-membro';
  end if;
  if exists (select 1 from public.players p where p.grupo_id = grupo and p.conta_id = eu) then
    raise exception 'Você já tem um Jogador nesse fut' using hint = 'ja-tem-jogador';
  end if;

  insert into public.players (user_id, grupo_id, conta_id, name, position)
  values (eu, grupo, eu, limpo, posicao)
  returning * into novo;
  return novo;
end;
$function$;

-- desvincular_jogador: only its comment changes.
CREATE OR REPLACE FUNCTION public.desvincular_jogador(jogador uuid)
 RETURNS public.players
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  eu uuid := (select auth.uid());
  alvo public.players;
begin
  if eu is null then
    raise exception 'desvincular_jogador requires a signed-in user' using errcode = '28000';
  end if;

  -- Leaving or being removed unlinks someone's Jogador, and a link can't land
  -- during a removal (#109), so their own Jogador is in a Grupo they belong to.
  select * into alvo from public.players p
  where p.id = jogador and public.papel_no_grupo(p.grupo_id) is not null
  for update;
  -- coalesce: with no conta_id or no papel the comparisons are NULL, and a
  -- NULL condition would let a stranger through.
  if alvo.id is null
    or not (
      coalesce(alvo.conta_id = eu, false)
      or coalesce(public.papel_no_grupo(alvo.grupo_id) in ('dono', 'admin'), false)
    ) then
    raise exception 'Só quem organiza o fut, ou a própria pessoa, desfaz o vínculo' using hint = 'sem-permissao';
  end if;

  update public.players set conta_id = null, updated_at = now() where id = alvo.id returning * into alvo;
  return alvo;
end;
$function$;

-- responder_presenca
CREATE OR REPLACE FUNCTION public.responder_presenca(partida uuid, jogador uuid, vou boolean)
 RETURNS public.presencas
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  eu uuid := (select auth.uid());
  alvo public.partidas;
  quem public.players;
  antes public.presencas;
  depois public.presencas;
  confirmados int;
begin
  if eu is null then
    raise exception 'responder_presenca requires a signed-in user' using errcode = '28000';
  end if;
  if vou is null then
    raise exception 'vou must be true or false' using errcode = '22023';
  end if;

  -- The Jogador's own lock, shared, before the Partida's. excluir_jogador
  -- takes it exclusively before it locks that Jogador's Partidas, so an answer
  -- and a delete of the same Jogador never end up holding one lock each (#108).
  -- Only for a Jogador of a fut the caller is in (#86).
  if exists (select 1 from public.players j where j.id = jogador and public.papel_no_grupo(j.grupo_id) is not null) then
    perform pg_catalog.pg_advisory_xact_lock_shared(pg_catalog.hashtextextended('jogador:' || jogador::text, 0));
  end if;

  -- The Partida's row lock serializes every answer to this Partida: counting
  -- the confirmed and taking a vaga can't interleave, so the last vaga goes
  -- to exactly one Jogador.
  select * into alvo from public.partidas p
  where p.id = partida and public.papel_no_grupo(p.grupo_id) is not null
  for update;
  if alvo.id is null or public.papel_no_grupo(alvo.grupo_id) is null then
    raise exception 'Partida não encontrada' using hint = 'nao-encontrada';
  end if;
  if alvo.cancelada_em is not null then
    raise exception 'Essa Partida foi cancelada' using hint = 'cancelada';
  end if;

  select * into quem from public.players j where j.id = jogador;
  if quem.id is null or quem.grupo_id <> alvo.grupo_id then
    raise exception 'Esse Jogador não é desse fut' using hint = 'jogador-de-fora';
  end if;
  if not (
    coalesce(quem.conta_id = eu, false)
    or coalesce(public.papel_no_grupo(alvo.grupo_id) in ('dono', 'admin'), false)
  ) then
    raise exception 'Você só responde pelo seu Jogador' using hint = 'sem-permissao';
  end if;

  -- Once the Partida started, the list is what happened: only the dono and
  -- admins change it, to record who really showed up (it feeds Frequência).
  if alvo.inicio <= now() and coalesce(public.papel_no_grupo(alvo.grupo_id) in ('dono', 'admin'), false) is false then
    raise exception 'A Partida já começou' using hint = 'ja-comecou';
  end if;

  select * into antes from public.presencas c where c.partida_id = alvo.id and c.jogador_id = quem.id;

  if vou then
    -- Already going or waiting: keep their place.
    if antes.situacao in ('confirmado', 'espera') then
      return antes;
    end if;

    select count(*) into confirmados
    from public.presencas c
    where c.partida_id = alvo.id and c.situacao = 'confirmado';

    insert into public.presencas (partida_id, jogador_id, situacao, pediu_vaga_em, respondido_por)
    values (
      alvo.id,
      quem.id,
      case when confirmados < alvo.vagas then 'confirmado' else 'espera' end::public.situacao_presenca,
      clock_timestamp(),
      eu
    )
    on conflict (partida_id, jogador_id) do update
      set situacao = excluded.situacao,
          pediu_vaga_em = excluded.pediu_vaga_em,
          respondido_por = excluded.respondido_por,
          updated_at = now()
    returning * into depois;
    return depois;
  end if;

  insert into public.presencas (partida_id, jogador_id, situacao, pediu_vaga_em, respondido_por)
  values (alvo.id, quem.id, 'nao_vou', null, eu)
  on conflict (partida_id, jogador_id) do update
    set situacao = 'nao_vou', pediu_vaga_em = null, respondido_por = excluded.respondido_por, updated_at = now()
  returning * into depois;

  -- A vaga freed up: the first in the lista de espera takes it, in this
  -- same transaction.
  if antes.situacao = 'confirmado' then
    perform public.promover_espera(alvo.id);
  end if;

  return depois;
end;
$function$;

-- excluir_jogador: the dono or an admin removes a Jogador from the Elenco,
-- with their presences. Returns the deleted row, so the app can delete the
-- photo afterwards. Same rule as the players_delete_gestor policy.
create function public.excluir_jogador(grupo uuid, jogador uuid)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  alvo public.players;
begin
  if (select auth.uid()) is null then
    raise exception 'excluir_jogador requires a signed-in user' using errcode = '28000';
  end if;
  if not coalesce(public.papel_no_grupo(grupo) in ('dono', 'admin'), false)
    or not exists (select 1 from public.players j where j.id = jogador and j.grupo_id = grupo) then
    raise exception 'Só quem organiza o fut exclui Jogadores' using hint = 'sem-permissao';
  end if;

  -- 1. The Jogador's own lock. responder_presenca takes it shared before the
  -- Partida, so from here on no answer for this Jogador is running or starts.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('jogador:' || jogador::text, 0));

  -- 2. Every Partida the Jogador is in, in id order, the lock responder_presenca
  -- takes first. Now the delete's trigger (presencas_promove_ao_excluir) never
  -- waits for a Partida while holding the Jogador (#108).
  perform 1 from public.partidas p
  where p.id in (select c.partida_id from public.presencas c where c.jogador_id = jogador)
  order by p.id
  for update;

  -- Still the dono or an admin after waiting for those locks.
  if not coalesce(public.papel_no_grupo(grupo) in ('dono', 'admin'), false) then
    raise exception 'Só quem organiza o fut exclui Jogadores' using hint = 'sem-permissao';
  end if;

  -- 3. The Jogador.
  delete from public.players j where j.id = jogador and j.grupo_id = grupo returning * into alvo;
  if alvo.id is null then
    raise exception 'Só quem organiza o fut exclui Jogadores' using hint = 'sem-permissao';
  end if;
  return alvo;
end;
$$;

revoke execute on function public.excluir_jogador(uuid, uuid) from public, anon;
grant execute on function public.excluir_jogador(uuid, uuid) to authenticated;

-- excluir_grupo
CREATE OR REPLACE FUNCTION public.excluir_grupo(grupo uuid, confirmacao text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  atual text;
begin
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono exclui o fut' using hint = 'sem-permissao';
  end if;
  select g.nome into atual from public.grupos g where g.id = grupo for update;
  -- Still the dono after waiting for the lock (see remover_do_grupo).
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono exclui o fut' using hint = 'sem-permissao';
  end if;
  if lower(btrim(coalesce(confirmacao, ''))) <> lower(btrim(atual)) then
    raise exception 'O nome não confere' using hint = 'nome-nao-confere';
  end if;
  -- Every Partida of the fut, in id order, before the delete cascades to the
  -- Jogadores (see excluir_jogador, #108).
  perform 1 from public.partidas p where p.grupo_id = grupo order by p.id for update;
  delete from public.grupos g where g.id = grupo;
end;
$function$;
