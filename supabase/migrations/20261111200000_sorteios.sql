-- The Sorteio moves to the server and lives on the Partida, with a snapshot of
-- each Jogador's rating and attributes at draw time (ADR 0004).

-- Created early on and never used by the app.
drop table public.teams;

create table public.sorteios (
  partida_id uuid primary key references public.partidas(id) on delete cascade,
  -- [{ "nome": "Time 1", "jogadores": [{ id, name, position, rating, attributes, image }] }, …]
  -- A copy, not a reference: editing a Jogador later doesn't change these Times.
  times jsonb not null,
  sorteado_por uuid default auth.uid() references auth.users(id) on delete set null,
  sorteado_em timestamptz not null default now(),
  publicado_em timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.sorteios enable row level security;
alter table public.sorteios force row level security;
revoke all on table public.sorteios from anon, authenticated;
-- Read-only from the API: saving and publishing go through the functions
-- below, which build the snapshot from the database, so nobody can write a
-- made-up rating.
grant select on table public.sorteios to authenticated;

-- The dono and admins see the draft; every Membro sees it once published.
create policy "sorteios_select" on public.sorteios
  for select to authenticated
  using (
    exists (
      select 1 from public.partidas p
      where p.id = partida_id
        and (
          public.papel_no_grupo(p.grupo_id) in ('dono', 'admin')
          or (publicado_em is not null and public.papel_no_grupo(p.grupo_id) is not null)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- Saving a draw or an adjustment.
--   times: [[jogador_id, …], …], one array per Time, 2 to 6 Times.
--   novo:  true for a fresh draw (snapshot from the Jogadores as they are now);
--          false for an adjustment (each Jogador keeps the snapshot taken at
--          draw time).
-- Every confirmed Jogador must be in exactly one Time, and nobody else: the
-- lista de espera never plays. Takes the Partida's row lock, the same one
-- responder_presenca takes, so presence can't change halfway through.
-- Refusals carry the reason in HINT:
--   nao-encontrada | cancelada | sem-permissao | publicado | times-invalidos | lista-mudou
-- ---------------------------------------------------------------------------
create function public.salvar_sorteio(partida uuid, times jsonb, novo boolean)
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

  if novo or atual.partida_id is null then
    -- Fresh draw: copy each Jogador as they are now.
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
  else
    -- Adjustment: move the snapshots already taken.
    select jsonb_agg(
      jsonb_build_object(
        'nome', 'Time ' || t.ordem,
        'jogadores', (
          select jsonb_agg(antigo.j order by m.pos)
          from jsonb_array_elements_text(t.membros) with ordinality as m(id, pos)
          join (
            select x as j from jsonb_array_elements(atual.times) tt, jsonb_array_elements(tt -> 'jogadores') x
          ) antigo on antigo.j ->> 'id' = m.id
        )
      )
      order by t.ordem
    ) into retrato
    from jsonb_array_elements(times) with ordinality as t(membros, ordem);
  end if;

  -- Every requested Jogador made it into the snapshot. An adjustment can't
  -- bring in someone the draw never had (they confirmed after it).
  if (select count(*) from jsonb_array_elements(retrato) t, jsonb_array_elements(t -> 'jogadores') x) <> cardinality(ids) then
    raise exception 'A lista de confirmados mudou: sorteie de novo' using hint = 'lista-mudou';
  end if;

  insert into public.sorteios (partida_id, times, sorteado_por)
  values (alvo.id, retrato, eu)
  on conflict (partida_id) do update
    set times = excluded.times,
        sorteado_por = case when novo then excluded.sorteado_por else public.sorteios.sorteado_por end,
        sorteado_em = case when novo then now() else public.sorteios.sorteado_em end,
        updated_at = now()
  returning * into salvo;
  return salvo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Publishing: every Membro sees the Times, and they're frozen. Refused if the
-- confirmed list changed since the draw (nobody plays who dropped out).
-- ---------------------------------------------------------------------------
create function public.publicar_sorteio(partida uuid)
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
begin
  if eu is null then
    raise exception 'publicar_sorteio requires a signed-in user' using errcode = '28000';
  end if;

  select * into alvo from public.partidas p where p.id = partida for update;
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
$$;

revoke execute on function public.salvar_sorteio(uuid, jsonb, boolean) from public, anon;
revoke execute on function public.publicar_sorteio(uuid) from public, anon;
grant execute on function public.salvar_sorteio(uuid, jsonb, boolean) to authenticated;
grant execute on function public.publicar_sorteio(uuid) to authenticated;

alter publication supabase_realtime add table public.sorteios;
