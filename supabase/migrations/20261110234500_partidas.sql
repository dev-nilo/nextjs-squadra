-- Partidas and Presença. A Partida has a start, a place and a number of
-- vagas. Presence belongs to the Jogador: vou or não vou. Once the vagas are
-- taken, a "vou" goes to a FIFO lista de espera, and whoever drops out hands
-- their vaga to the first in line, in the same transaction.

create table public.partidas (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  inicio timestamptz not null,
  local text not null check (char_length(btrim(local)) between 1 and 80),
  vagas int not null check (vagas between 2 and 60),
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  cancelada_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partidas_grupo_inicio_idx on public.partidas (grupo_id, inicio desc);

create type public.situacao_presenca as enum ('confirmado', 'espera', 'nao_vou');

create table public.presencas (
  partida_id uuid not null references public.partidas(id) on delete cascade,
  jogador_id uuid not null references public.players(id) on delete cascade,
  situacao public.situacao_presenca not null,
  -- When they last said "vou": the lista de espera's order. Read with
  -- clock_timestamp() after taking the Partida's lock, so it follows the order
  -- in which the answers were actually applied.
  pediu_vaga_em timestamptz,
  respondido_por uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (partida_id, jogador_id),
  check ((situacao = 'nao_vou') = (pediu_vaga_em is null))
);

create index presencas_espera_idx on public.presencas (partida_id, pediu_vaga_em) where situacao = 'espera';
create index presencas_jogador_idx on public.presencas (jogador_id);

-- ---------------------------------------------------------------------------
-- RLS. Every Membro reads the Partidas and the presence list; the dono and
-- admins create, edit and cancel Partidas. Presence only changes through
-- responder_presenca(), so it has no write grants at all.
-- ---------------------------------------------------------------------------
alter table public.partidas enable row level security;
alter table public.partidas force row level security;
alter table public.presencas enable row level security;
alter table public.presencas force row level security;

revoke all on table public.partidas from anon, authenticated;
revoke all on table public.presencas from anon, authenticated;
grant select, insert on table public.partidas to authenticated;
grant update (inicio, local, vagas, cancelada_em) on table public.partidas to authenticated;
grant select on table public.presencas to authenticated;

create policy "partidas_select_membro" on public.partidas
  for select to authenticated
  using (public.papel_no_grupo(grupo_id) is not null);

create policy "partidas_insert_gestor" on public.partidas
  for insert to authenticated
  with check (
    criado_por = (select auth.uid())
    and cancelada_em is null
    and public.papel_no_grupo(grupo_id) in ('dono', 'admin')
  );

create policy "partidas_update_gestor" on public.partidas
  for update to authenticated
  using (public.papel_no_grupo(grupo_id) in ('dono', 'admin'))
  with check (public.papel_no_grupo(grupo_id) in ('dono', 'admin'));

create policy "presencas_select_membro" on public.presencas
  for select to authenticated
  using (
    exists (
      select 1 from public.partidas p
      where p.id = partida_id and public.papel_no_grupo(p.grupo_id) is not null
    )
  );

-- ---------------------------------------------------------------------------
-- Promotion: fill free vagas from the lista de espera, oldest "vou" first.
-- Callers hold the Partida's row lock.
-- ---------------------------------------------------------------------------
create function public.promover_espera(alvo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  livres int;
begin
  select p.vagas - (select count(*) from public.presencas c where c.partida_id = p.id and c.situacao = 'confirmado')
  into livres
  from public.partidas p
  where p.id = alvo;

  if livres is null or livres <= 0 then
    return;
  end if;

  update public.presencas
  set situacao = 'confirmado', updated_at = now()
  where (partida_id, jogador_id) in (
    select e.partida_id, e.jogador_id
    from public.presencas e
    where e.partida_id = alvo and e.situacao = 'espera'
    order by e.pediu_vaga_em, e.jogador_id
    limit livres
  );
end;
$$;

revoke execute on function public.promover_espera(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Vou / não vou. The only way presence changes.
--   A Membro answers for the Jogador linked to their account; the dono and
--   admins answer for any Jogador of the Grupo.
--   Refusals carry the reason in HINT: nao-encontrada | cancelada | jogador-de-fora | sem-permissao.
-- ---------------------------------------------------------------------------
create function public.responder_presenca(partida uuid, jogador uuid, vou boolean)
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

revoke execute on function public.responder_presenca(uuid, uuid, boolean) from public, anon;
grant execute on function public.responder_presenca(uuid, uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Changing the vagas: more vagas promote the lista de espera; fewer than the
-- Jogadores already confirmed is refused (nobody loses a confirmed vaga).
-- The UPDATE holds the Partida's row lock, like responder_presenca does.
-- ---------------------------------------------------------------------------
create function public.partidas_confere_vagas()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  confirmados int;
begin
  new.updated_at := now();
  if new.vagas < old.vagas then
    select count(*) into confirmados
    from public.presencas c
    where c.partida_id = new.id and c.situacao = 'confirmado';
    if new.vagas < confirmados then
      raise exception 'Já tem % confirmados: não dá pra deixar % vagas', confirmados, new.vagas
        using errcode = '22023', hint = 'vagas-abaixo-dos-confirmados';
    end if;
  end if;
  return new;
end;
$$;

create trigger partidas_confere_vagas
  before update on public.partidas
  for each row execute function public.partidas_confere_vagas();

create function public.partidas_promove_depois()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.vagas > old.vagas and new.cancelada_em is null then
    perform public.promover_espera(new.id);
  end if;
  return null;
end;
$$;

create trigger partidas_promove_depois
  after update of vagas on public.partidas
  for each row execute function public.partidas_promove_depois();

revoke execute on function public.partidas_confere_vagas() from public, anon, authenticated;
revoke execute on function public.partidas_promove_depois() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: the presence list updates live. Supabase Realtime applies these
-- tables' RLS to each subscriber.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.partidas, public.presencas;
