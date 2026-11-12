-- ---------------------------------------------------------------------------
-- Moving one Jogador to another Time of the draft, under the Partida's row
-- lock (the one salvar_sorteio and responder_presenca take).
--
-- The move used to be computed in the Server Action from a read taken outside
-- the lock, and saved back as a whole assignment through
-- salvar_sorteio(novo => false). Two admins moving at once lost one of the
-- moves, and a stale move could land on a fresh redraw. Here the move is read
-- and written in one transaction, and `sorteado_em` is the draw the caller saw:
-- if the Times were drawn again since, the move is refused.
--
-- Expand step: salvar_sorteio keeps its `novo` parameter until the app no
-- longer calls it with false.
--
--   para_time:   index of the destination Time, from 0.
--   sorteado_em: the sorteado_em of the draw the caller is looking at.
-- The snapshot only changes Time: ratings stay as drawn (ADR 0004).
-- Refusals carry the reason in HINT:
--   nao-encontrada | sem-permissao | cancelada | sem-sorteio | publicado |
--   sorteio-mudou | lista-mudou | fora-do-sorteio | times-invalidos | time-vazio
-- ---------------------------------------------------------------------------
create function public.mover_no_sorteio(partida uuid, jogador uuid, para_time integer, sorteado_em timestamptz)
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
  de_time integer;
  movido jsonb;
  novos jsonb;
  salvo public.sorteios;
begin
  if eu is null then
    raise exception 'mover_no_sorteio requires a signed-in user' using errcode = '28000';
  end if;

  select * into alvo from public.partidas p where p.id = partida for update;
  if alvo.id is null or public.papel_no_grupo(alvo.grupo_id) is null then
    raise exception 'Partida não encontrada' using hint = 'nao-encontrada';
  end if;
  if coalesce(public.papel_no_grupo(alvo.grupo_id) in ('dono', 'admin'), false) is false then
    raise exception 'Só quem organiza o fut mexe nos Times' using hint = 'sem-permissao';
  end if;
  if alvo.cancelada_em is not null then
    raise exception 'Essa Partida foi cancelada' using hint = 'cancelada';
  end if;

  select * into atual from public.sorteios s where s.partida_id = alvo.id;
  if atual.partida_id is null then
    raise exception 'Ainda não tem sorteio' using hint = 'sem-sorteio';
  end if;
  if atual.publicado_em is not null then
    raise exception 'Os Times já foram publicados' using hint = 'publicado';
  end if;
  if atual.sorteado_em is distinct from mover_no_sorteio.sorteado_em then
    raise exception 'Os Times foram sorteados de novo' using hint = 'sorteio-mudou';
  end if;

  -- Same rule as publishing: the draft only moves while it still has exactly
  -- the confirmed Jogadores. Otherwise it has to be drawn again.
  select array_agg((x ->> 'id')::uuid) into ids
  from jsonb_array_elements(atual.times) t, jsonb_array_elements(t -> 'jogadores') x;
  select coalesce(array_agg(c.jogador_id), '{}') into confirmados
  from public.presencas c
  where c.partida_id = alvo.id and c.situacao = 'confirmado';
  if not (ids @> confirmados and confirmados @> ids) then
    raise exception 'A lista de confirmados mudou: sorteie de novo' using hint = 'lista-mudou';
  end if;

  select (t.ordem - 1)::integer, x into de_time, movido
  from jsonb_array_elements(atual.times) with ordinality as t(membros, ordem),
       jsonb_array_elements(t.membros -> 'jogadores') x
  where x ->> 'id' = jogador::text;
  if de_time is null then
    raise exception 'Esse Jogador não está no sorteio' using hint = 'fora-do-sorteio';
  end if;
  if para_time is null or para_time < 0 or para_time >= jsonb_array_length(atual.times) then
    raise exception 'Time inválido' using hint = 'times-invalidos';
  end if;
  if para_time = de_time then
    return atual;
  end if;
  if jsonb_array_length(atual.times -> de_time -> 'jogadores') = 1 then
    raise exception 'Um Time não pode ficar vazio' using hint = 'time-vazio';
  end if;

  novos := jsonb_set(
    atual.times,
    array[de_time::text, 'jogadores'],
    (
      select jsonb_agg(j.x order by j.pos)
      from jsonb_array_elements(atual.times -> de_time -> 'jogadores') with ordinality as j(x, pos)
      where j.x ->> 'id' <> jogador::text
    )
  );
  novos := jsonb_set(
    novos,
    array[para_time::text, 'jogadores'],
    (novos -> para_time -> 'jogadores') || jsonb_build_array(movido)
  );

  update public.sorteios s
  set times = novos, updated_at = now()
  where s.partida_id = alvo.id
  returning * into salvo;
  return salvo;
end;
$$;

revoke execute on function public.mover_no_sorteio(uuid, uuid, integer, timestamptz) from public, anon;
grant execute on function public.mover_no_sorteio(uuid, uuid, integer, timestamptz) to authenticated;
