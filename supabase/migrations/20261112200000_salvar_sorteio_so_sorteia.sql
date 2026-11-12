-- ---------------------------------------------------------------------------
-- Contract step after mover_no_sorteio (20261112180000): salvar_sorteio only
-- draws. Moving a Jogador goes through mover_no_sorteio, under the same lock,
-- so the "adjustment" path (novo => false) goes. A draft whose confirmed list
-- changed is drawn again, as the screen already asks.
--
-- `novo` stays as an ignored parameter with a default, so the app deployed
-- before this migration (which still sends novo => true) keeps working until
-- the new one, which doesn't send it, is live. Drop and create in one
-- transaction: there is no moment without the function.
-- ---------------------------------------------------------------------------
drop function public.salvar_sorteio(uuid, jsonb, boolean);

-- Saving a fresh draw.
--   times: [[jogador_id, …], …], one array per Time, 2 to 6 Times.
-- Every confirmed Jogador must be in exactly one Time, and nobody else: the
-- lista de espera never plays. The snapshot is taken here, from players, so
-- no client can save a made-up rating (ADR 0004). Takes the Partida's row
-- lock, the same one responder_presenca and mover_no_sorteio take.
-- Refusals carry the reason in HINT:
--   nao-encontrada | cancelada | sem-permissao | publicado | times-invalidos | lista-mudou
create function public.salvar_sorteio(partida uuid, times jsonb, novo boolean default true)
returns public.sorteios
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  alvo public.partidas;
  atual public.sorteios;
  ids uuid[];
  confirmados uuid[];
  retrato jsonb;
  salvo public.sorteios;
begin
  if eu is null then
    raise exception 'salvar_sorteio requires a signed-in user' using errcode = '28000';
  end if;

  select * into alvo from public.partidas p where p.id = partida for update;
  if alvo.id is null or public.papel_no_grupo(alvo.grupo_id) is null then
    raise exception 'Partida não encontrada' using hint = 'nao-encontrada';
  end if;
  if coalesce(public.papel_no_grupo(alvo.grupo_id) in ('dono', 'admin'), false) is false then
    raise exception 'Só quem organiza o fut sorteia os Times' using hint = 'sem-permissao';
  end if;
  if alvo.cancelada_em is not null then
    raise exception 'Essa Partida foi cancelada' using hint = 'cancelada';
  end if;

  select * into atual from public.sorteios s where s.partida_id = alvo.id;
  if atual.publicado_em is not null then
    raise exception 'Os Times já foram publicados' using hint = 'publicado';
  end if;

  -- Shape: 2..6 non-empty arrays of uuids, nobody twice.
  if jsonb_typeof(times) is distinct from 'array'
    or jsonb_array_length(times) not between 2 and 6
    or exists (
      select 1 from jsonb_array_elements(times) t
      where jsonb_typeof(t) <> 'array' or jsonb_array_length(t) = 0
    ) then
    raise exception 'Times inválidos' using hint = 'times-invalidos';
  end if;
  begin
    select array_agg(j::uuid) into ids
    from jsonb_array_elements(times) t, jsonb_array_elements_text(t) j;
  exception when invalid_text_representation then
    raise exception 'Times inválidos' using hint = 'times-invalidos';
  end;
  if cardinality(ids) <> (select count(distinct x) from unnest(ids) x) then
    raise exception 'Um Jogador aparece em dois Times' using hint = 'times-invalidos';
  end if;

  -- Exactly the confirmed Jogadores, right now.
  select coalesce(array_agg(c.jogador_id), '{}') into confirmados
  from public.presencas c
  where c.partida_id = alvo.id and c.situacao = 'confirmado';
  if not (ids @> confirmados and confirmados @> ids) then
    raise exception 'A lista de confirmados mudou: sorteie de novo' using hint = 'lista-mudou';
  end if;

  -- Copy each Jogador as they are now.
  select jsonb_agg(
    jsonb_build_object(
      'nome', 'Time ' || t.ordem,
      'jogadores', (
        select jsonb_agg(
          jsonb_build_object(
            'id', p.id,
            'name', p.name,
            'position', p.position,
            'rating', p.ovr,
            'image', p.image_url,
            'attributes', jsonb_build_object(
              'velocidade', p.velocidade, 'resistencia', p.resistencia, 'chute', p.chute,
              'posicionamento', p.posicionamento, 'defesa', p.defesa, 'drible', p.drible,
              'passe', p.passe, 'fisico', p.fisico
            )
          )
          order by j.pos
        )
        from jsonb_array_elements_text(t.membros) with ordinality as j(id, pos)
        join public.players p on p.id = j.id::uuid
      )
    )
    order by t.ordem
  ) into retrato
  from jsonb_array_elements(times) with ordinality as t(membros, ordem);

  insert into public.sorteios (partida_id, times, sorteado_por)
  values (alvo.id, retrato, eu)
  on conflict (partida_id) do update
    set times = excluded.times,
        sorteado_por = excluded.sorteado_por,
        sorteado_em = now(),
        updated_at = now()
  returning * into salvo;
  return salvo;
end;
$$;

revoke execute on function public.salvar_sorteio(uuid, jsonb, boolean) from public, anon;
grant execute on function public.salvar_sorteio(uuid, jsonb, boolean) to authenticated;
