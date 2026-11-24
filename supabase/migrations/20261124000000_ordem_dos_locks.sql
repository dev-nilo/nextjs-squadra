-- Lock order (issues #86 and #91).
--
-- #86: these functions took `select … for update` on a row and only then asked
-- whether the caller belongs to its Grupo. Anyone signed in who knew an id could
-- hold that lock for the length of their own transaction before being refused.
-- Now the membership test is part of the locking query: Postgres only locks rows
-- that pass the WHERE, so an outsider finds nothing and locks nothing. The checks
-- after the lock stay, because a role can change while the caller waits for it.
--
-- #91: every function that changes the people of a Grupo, or the Grupo itself,
-- now checks that the caller is in it, locks the grupos row first, and checks the
-- caller's papel again after the lock (the fut may have changed hands while it
-- waited). sair_do_grupo and passar_posse already locked it; remover_do_grupo
-- and mudar_papel locked the person's grupo_membros row and then players, the
-- reverse of sair_do_grupo, so removing someone while they left could deadlock
-- (40P01). passar_posse now checks membership before its lock, for the same
-- reason as #86. excluir_grupo didn't check again after its lock, and
-- renomear_grupo took none, so a dono who had just handed the fut over could
-- still delete or rename it.
--
-- Bodies are today's definitions with only those lines changed.

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

-- salvar_sorteio
CREATE OR REPLACE FUNCTION public.salvar_sorteio(partida uuid, times jsonb)
 RETURNS public.sorteios
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  select * into alvo from public.partidas p
  where p.id = partida and public.papel_no_grupo(p.grupo_id) is not null
  for update;
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
$function$;

-- mover_no_sorteio
CREATE OR REPLACE FUNCTION public.mover_no_sorteio(partida uuid, jogador uuid, para_time integer, sorteado_em timestamp with time zone)
 RETURNS public.sorteios
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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

  select * into alvo from public.partidas p
  where p.id = partida and public.papel_no_grupo(p.grupo_id) is not null
  for update;
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
$function$;

-- publicar_sorteio
CREATE OR REPLACE FUNCTION public.publicar_sorteio(partida uuid)
 RETURNS public.sorteios
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  eu uuid := (select auth.uid());
  alvo public.partidas;
  atual public.sorteios;
  ids uuid[];
  confirmados uuid[];
begin
  if eu is null then
    raise exception 'publicar_sorteio requires a signed-in user' using errcode = '28000';
  end if;

  select * into alvo from public.partidas p
  where p.id = partida and public.papel_no_grupo(p.grupo_id) is not null
  for update;
  if alvo.id is null or public.papel_no_grupo(alvo.grupo_id) is null then
    raise exception 'Partida não encontrada' using hint = 'nao-encontrada';
  end if;
  if coalesce(public.papel_no_grupo(alvo.grupo_id) in ('dono', 'admin'), false) is false then
    raise exception 'Só quem organiza o fut publica os Times' using hint = 'sem-permissao';
  end if;
  if alvo.cancelada_em is not null then
    raise exception 'Essa Partida foi cancelada' using hint = 'cancelada';
  end if;

  select * into atual from public.sorteios s where s.partida_id = alvo.id for update;
  if atual.partida_id is null then
    raise exception 'Ainda não tem sorteio' using hint = 'sem-sorteio';
  end if;
  if atual.publicado_em is not null then
    return atual;
  end if;

  select array_agg((x ->> 'id')::uuid) into ids
  from jsonb_array_elements(atual.times) t, jsonb_array_elements(t -> 'jogadores') x;
  select coalesce(array_agg(c.jogador_id), '{}') into confirmados
  from public.presencas c
  where c.partida_id = alvo.id and c.situacao = 'confirmado';
  if not (ids @> confirmados and confirmados @> ids) then
    raise exception 'A lista de confirmados mudou: sorteie de novo' using hint = 'lista-mudou';
  end if;

  update public.sorteios set publicado_em = now(), updated_at = now()
  where partida_id = alvo.id
  returning * into atual;
  return atual;
end;
$function$;

-- vincular_jogador
CREATE OR REPLACE FUNCTION public.vincular_jogador(jogador uuid)
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
    raise exception 'vincular_jogador requires a signed-in user' using errcode = '28000';
  end if;

  -- Lock the row so two people can't claim the same Jogador at once.
  select * into alvo from public.players p
  where p.id = jogador and public.papel_no_grupo(p.grupo_id) is not null
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

-- desvincular_jogador
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

  -- Leaving or being removed unlinks someone's Jogador, so their own Jogador is
  -- normally in a Grupo they belong to. (A link that races a removal can break
  -- that; a dono or admin can still unlink it.)
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

-- remover_do_grupo
CREATE OR REPLACE FUNCTION public.remover_do_grupo(grupo uuid, pessoa uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  alvo public.grupo_membros;
begin
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono remove pessoas' using hint = 'sem-permissao';
  end if;
  if pessoa = (select auth.uid()) then
    raise exception 'O dono não se remove' using hint = 'e-voce';
  end if;

  -- The grupos row first, like every people function, then check again: the
  -- fut may have changed hands while this waited for the lock.
  perform 1 from public.grupos g where g.id = grupo for update;
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono remove pessoas' using hint = 'sem-permissao';
  end if;

  select * into alvo from public.grupo_membros m where m.grupo_id = grupo and m.user_id = pessoa for update;
  if alvo.user_id is null then
    raise exception 'Essa pessoa não está no fut' using hint = 'pessoa-fora';
  end if;
  if alvo.papel = 'dono' then
    raise exception 'Ninguém remove o dono' using hint = 'e-o-dono';
  end if;

  perform public.desligar_do_grupo(grupo, pessoa);
end;
$function$;

-- mudar_papel
CREATE OR REPLACE FUNCTION public.mudar_papel(grupo uuid, pessoa uuid, novo public.papel_grupo)
 RETURNS public.grupo_membros
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  alvo public.grupo_membros;
begin
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono muda papéis' using hint = 'sem-permissao';
  end if;
  if novo is null or novo not in ('admin', 'membro') then
    raise exception 'Papel inválido' using errcode = '22023';
  end if;
  if pessoa = (select auth.uid()) then
    raise exception 'O dono não muda o próprio papel' using hint = 'e-voce';
  end if;

  -- The grupos row first, like every people function, then check again: the
  -- fut may have changed hands while this waited for the lock.
  perform 1 from public.grupos g where g.id = grupo for update;
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono muda papéis' using hint = 'sem-permissao';
  end if;

  select * into alvo from public.grupo_membros m where m.grupo_id = grupo and m.user_id = pessoa for update;
  if alvo.user_id is null then
    raise exception 'Essa pessoa não está no fut' using hint = 'pessoa-fora';
  end if;
  if alvo.papel = 'dono' then
    raise exception 'Ninguém muda o papel do dono' using hint = 'e-o-dono';
  end if;

  update public.grupo_membros m set papel = novo
  where m.grupo_id = grupo and m.user_id = pessoa
  returning * into alvo;
  return alvo;
end;
$function$;

-- passar_posse
CREATE OR REPLACE FUNCTION public.passar_posse(grupo uuid, pessoa uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  eu uuid := (select auth.uid());
  alvo public.grupo_membros;
begin
  -- A member before the lock, the dono after it (see remover_do_grupo).
  perform public.exigir_papel(grupo);
  perform 1 from public.grupos g where g.id = grupo for update;
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono passa o fut' using hint = 'sem-permissao';
  end if;
  if pessoa = eu then
    raise exception 'O fut já é seu' using hint = 'e-voce';
  end if;

  select * into alvo from public.grupo_membros m where m.grupo_id = grupo and m.user_id = pessoa for update;
  if alvo.user_id is null then
    raise exception 'Essa pessoa não está no fut' using hint = 'pessoa-fora';
  end if;
  if alvo.papel <> 'admin' then
    raise exception 'O fut só pode passar pra um admin' using hint = 'so-para-admin';
  end if;

  update public.grupo_membros set papel = 'admin' where grupo_id = grupo and user_id = eu;
  update public.grupo_membros set papel = 'dono' where grupo_id = grupo and user_id = pessoa;
end;
$function$;

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
  delete from public.grupos g where g.id = grupo;
end;
$function$;

-- renomear_grupo
CREATE OR REPLACE FUNCTION public.renomear_grupo(grupo uuid, nome text)
 RETURNS public.grupos
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  limpo text := btrim(coalesce(nome, ''));
  atualizado public.grupos;
begin
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono renomeia o fut' using hint = 'sem-permissao';
  end if;
  if char_length(limpo) not between 1 and 60 then
    raise exception 'O nome do fut precisa ter entre 1 e 60 caracteres' using errcode = '22023';
  end if;
  -- The grupos row first, then check again (see remover_do_grupo).
  perform 1 from public.grupos g where g.id = grupo for update;
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono renomeia o fut' using hint = 'sem-permissao';
  end if;
  update public.grupos g set nome = limpo where g.id = grupo returning * into atualizado;
  return atualizado;
end;
$function$;
