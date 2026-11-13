-- ---------------------------------------------------------------------------
-- A membro can't answer once the Partida started. The screen already hid the
-- buttons, but the database took the answer from anyone calling the Server
-- Action, and a late answer changed that Jogador's Frequência. The dono and
-- admins still can, to fix the list after the game.
--   Refusals carry the reason in HINT:
--   nao-encontrada | cancelada | jogador-de-fora | sem-permissao | ja-comecou
-- Same signature and body as in 20261110234500_partidas.sql, plus that check.
-- ---------------------------------------------------------------------------
create or replace function public.responder_presenca(partida uuid, jogador uuid, vou boolean)
returns public.presencas
language plpgsql
security definer
set search_path = ''
as $$
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

  -- The Partida's row lock serializes every answer to this Partida: counting
  -- the confirmed and taking a vaga can't interleave, so the last vaga goes
  -- to exactly one Jogador.
  select * into alvo from public.partidas p where p.id = partida for update;
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
$$;
