-- The demo: one shared account that anyone signs into with one click
-- ("Entrar como demo"), dono of its own Grupo, put back the way it was every
-- night by resetar_demo() (ADR 0005).
--
-- Same ids in every environment. Locally and on staging the seed creates the
-- account; in production the app creates it through the admin API the first
-- time someone asks for the demo (lib/demo-server.ts). It has no password:
-- the app signs it in with a one-time link it generates on the server.

create function public.conta_demo()
returns uuid
language sql
immutable
set search_path = ''
as $$ select 'dede0000-0000-4000-8000-000000000001'::uuid $$;

create function public.grupo_demo()
returns uuid
language sql
immutable
set search_path = ''
as $$ select 'dede0000-0000-4000-8000-000000000002'::uuid $$;

create function public.eh_demo()
returns boolean
language sql
stable
set search_path = ''
as $$ select coalesce((select auth.uid()) = public.conta_demo(), false) $$;

revoke execute on function public.conta_demo() from public, anon;
revoke execute on function public.grupo_demo() from public, anon;
revoke execute on function public.eh_demo() from public, anon;
grant execute on function public.conta_demo() to authenticated;
grant execute on function public.grupo_demo() to authenticated;
grant execute on function public.eh_demo() to authenticated;

-- The demo Grupo exists from now on, so its slug is taken before anyone else
-- can name a fut "Demo" (criar_grupo would make that one demo-2).
insert into public.grupos (id, slug, nome)
values (public.grupo_demo(), 'demo', 'Pelada da Firma');

-- ---------------------------------------------------------------------------
-- Guards. Every visitor shares the account, so what one does must not reach
-- anyone else: the demo stays in its Grupo and nobody else joins it.
-- ---------------------------------------------------------------------------

-- Joining happens in criar_grupo, aceitar_convite and resetar_demo; checking
-- the Membro row covers all of them, and the refusal rolls back the whole call
-- (criar_grupo's new Grupo included).
create function public.demo_fica_no_grupo_demo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.user_id = public.conta_demo()) <> (new.grupo_id = public.grupo_demo()) then
    raise exception 'A conta demo só joga no fut da demo, e ninguém mais entra nele'
      using errcode = '42501', hint = 'demo';
  end if;
  return new;
end;
$$;

create trigger demo_fica_no_grupo_demo
  before insert or update on public.grupo_membros
  for each row execute function public.demo_fica_no_grupo_demo();

revoke execute on function public.demo_fica_no_grupo_demo() from public, anon, authenticated;

-- Nobody deletes the demo Grupo (renaming is fine: the reset puts the name back).
create policy "grupos_demo_fica" on public.grupos
  as restrictive for delete to authenticated
  using (id <> public.grupo_demo());

-- No invite links to the demo Grupo: they couldn't be accepted anyway.
create policy "convites_sem_demo" on public.convites
  as restrictive for insert to authenticated
  with check (grupo_id <> public.grupo_demo());

-- No photo uploads: Storage files would outlive the nightly reset, in a
-- public bucket. (The app then keeps the photo in the Jogador row, which the
-- reset does clear.)
create policy "Demo uploads no player images" on storage.objects
  as restrictive for insert to authenticated
  with check (not public.eh_demo());

create policy "Demo replaces no player images" on storage.objects
  as restrictive for update to authenticated
  using (not public.eh_demo())
  with check (not public.eh_demo());

-- The account keeps its email and has no password, whatever the Auth API is
-- asked. The id is inlined: the trigger runs as Auth's own database role.
create function public.conta_demo_fixa()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.email is distinct from old.email
    or new.encrypted_password is distinct from old.encrypted_password
    or new.phone is distinct from old.phone
    or (coalesce(new.email_change, '') <> '' and new.email_change is distinct from old.email_change) then
    raise exception 'A conta demo não troca email nem senha' using errcode = '42501', hint = 'demo';
  end if;
  return new;
end;
$$;

create trigger conta_demo_fixa
  before update on auth.users
  for each row
  when (old.id = 'dede0000-0000-4000-8000-000000000001'::uuid)
  execute function public.conta_demo_fixa();

revoke execute on function public.conta_demo_fixa() from public, anon, authenticated;

-- The demo's Elenco. presenca: one letter per past Partida, oldest first
-- (C vou, N não vou, - no answer); agora: the open Partida. The past ones
-- never go over the 12 vagas (11 or 12 say vou).
create function public.demo_elenco()
returns table (
  ordem int, nome text, posicao text, pais text,
  vel int, res int, chu int, pos int, def int, dri int, pas int, fis int,
  presenca text, agora text
)
language sql
immutable
set search_path = ''
as $$
  select * from (values
    (1,  'Gatão',       'GOL', 'BR', 48, 72, 42, 86, 78, 38, 62, 80, 'CCCC', 'C'),
    (2,  'Mão de Onça', 'GOL', 'BR', 52, 66, 46, 80, 74, 40, 60, 72, 'N-CN', '-'),
    (3,  'Capitão',     'FIX', 'BR', 58, 78, 52, 82, 88, 46, 70, 86, 'CCCC', 'C'),
    (4,  'Xerifão',     'FIX', 'BR', 54, 74, 48, 78, 85, 42, 64, 84, 'CCNC', 'C'),
    (5,  'Zaga Seca',   'FIX', 'PT', 60, 70, 50, 72, 80, 44, 62, 78, 'C-CC', '-'),
    (6,  'Raçudo',      'FIX', 'BR', 56, 88, 46, 70, 76, 40, 58, 82, 'NCCC', 'C'),
    (7,  'Flecha',      'ALA', 'BR', 93, 84, 68, 70, 52, 84, 72, 64, 'CCCC', 'C'),
    (8,  'Motorzinho',  'ALA', 'BR', 82, 94, 62, 74, 60, 74, 78, 68, 'CNCC', 'C'),
    (9,  'Ligeirinho',  'ALA', 'AR', 90, 76, 66, 64, 48, 88, 70, 58, '-CC-', 'N'),
    (10, 'Professor',   'ALA', 'BR', 68, 72, 78, 86, 58, 84, 93, 62, 'CCCC', 'C'),
    (11, 'Canhotinha',  'ALA', 'UY', 74, 70, 86, 72, 54, 82, 84, 62, 'CCN-', '-'),
    (12, 'Garçom',      'ALA', 'BR', 70, 74, 66, 80, 56, 78, 90, 64, 'NCCC', 'C'),
    (13, 'Artilheiro',  'ATA', 'BR', 80, 70, 92, 86, 40, 84, 70, 78, 'CCCC', 'C'),
    (14, 'Tanque',      'ATA', 'BR', 64, 78, 84, 80, 50, 62, 66, 92, 'C-NC', '-'),
    (15, 'Fominha',     'ATA', 'IT', 78, 66, 76, 60, 36, 84, 52, 62, 'CCCN', '-'),
    (16, 'Pé Torto',    'ATA', 'BR', 54, 58, 60, 52, 40, 48, 50, 60, '-N-C', 'N')
  ) as v(ordem, nome, posicao, pais, vel, res, chu, pos, def, dri, pas, fis, presenca, agora)
$$;

revoke execute on function public.demo_elenco() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- The reset: the demo Grupo goes back to a known Elenco, four past Partidas
-- with published Times, and one open Partida half answered. Only the server
-- calls it (service_role): the nightly cron and the first demo sign-in.
-- ---------------------------------------------------------------------------
create function public.resetar_demo()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  conta uuid := public.conta_demo();
  grupo uuid := public.grupo_demo();
  -- Partida ids: ...0100 is the open one, ...0101 to ...0104 are 1 to 4 weeks ago.
  prefixo text := 'dede0000-0000-4000-8000-00000000010';
  hoje timestamptz := date_trunc('day', now()) + interval '23 hours'; -- 20:00 in Brasília
begin
  -- One reset at a time (the cron and a first sign-in could overlap).
  perform pg_advisory_xact_lock(hashtext('public.resetar_demo'));

  if not exists (select 1 from auth.users u where u.id = conta) then
    raise exception 'A conta demo ainda não existe' using hint = 'sem-conta-demo';
  end if;

  -- Whatever the visitors did goes: Partidas (with presence and Times), the
  -- Elenco, invites and Membros.
  delete from public.partidas p where p.grupo_id = grupo;
  delete from public.players j where j.grupo_id = grupo;
  delete from public.convites c where c.grupo_id = grupo;
  delete from public.grupo_membros m where m.grupo_id = grupo;

  insert into public.grupos (id, slug, nome, criado_por)
  values (grupo, 'demo', 'Pelada da Firma', conta)
  on conflict (id) do update set nome = excluded.nome, criado_por = excluded.criado_por;

  insert into public.grupo_membros (grupo_id, user_id, papel) values (grupo, conta, 'dono');

  -- The Elenco, as in demo_elenco(). OVR = rounded mean of the 8 attributes,
  -- as in lib/jogador.ts.
  insert into public.players (
    user_id, grupo_id, created_at, name, position, nationality, ovr,
    velocidade, resistencia, chute, posicionamento, defesa, drible, passe, fisico
  )
  select
    conta, grupo, now() - interval '120 days', e.nome, e.posicao, e.pais,
    round((e.vel + e.res + e.chu + e.pos + e.def + e.dri + e.pas + e.fis) / 8.0),
    e.vel, e.res, e.chu, e.pos, e.def, e.dri, e.pas, e.fis
  from public.demo_elenco() e;

  -- Four past Partidas, one a week, and the open one in three days.
  insert into public.partidas (id, grupo_id, inicio, local, vagas, criado_por)
  select
    (prefixo || s)::uuid, grupo,
    case when s = 0 then hoje + interval '3 days' else hoje - s * interval '7 days' end,
    'Arena do Bairro', 12, conta
  from generate_series(0, 4) s;

  -- Presence.
  insert into public.presencas (partida_id, jogador_id, situacao, pediu_vaga_em, respondido_por)
  select
    p.id,
    j.id,
    (case r.letra when 'C' then 'confirmado' else 'nao_vou' end)::public.situacao_presenca,
    -- Asked for a vaga a few days before (the open one: yesterday), in Elenco order.
    case when r.letra = 'C' then least(p.inicio - interval '3 days', now() - interval '1 day') + e.ordem * interval '7 minutes' end,
    conta
  from public.demo_elenco() e
  join public.players j on j.grupo_id = grupo and j.name = e.nome
  cross join generate_series(0, 4) s
  join public.partidas p on p.id = (prefixo || s)::uuid
  -- Week s ago is letter 5 - s of the pattern (oldest first); the open one is "agora".
  cross join lateral (select case when s = 0 then e.agora else substr(e.presenca, 5 - s, 1) end as letra) r
  where r.letra in ('C', 'N');

  -- Published Times for every past Partida: confirmed Jogadores by OVR, dealt
  -- in a snake (1, 2, 2, 1, ...), with the usual snapshot (ADR 0004).
  insert into public.sorteios (partida_id, times, sorteado_por, sorteado_em, publicado_em)
  select
    t.partida_id,
    jsonb_agg(jsonb_build_object('nome', 'Time ' || t.numero, 'jogadores', t.jogadores) order by t.numero),
    conta,
    min(t.inicio) - interval '1 day',
    min(t.inicio) - interval '1 day'
  from (
    select
      d.partida_id,
      d.inicio,
      case when (d.vez - 1) % 4 in (0, 3) then 1 else 2 end as numero,
      jsonb_agg(
        jsonb_build_object(
          'id', d.id, 'name', d.name, 'position', d.position, 'rating', d.ovr, 'image', d.image_url,
          'attributes', jsonb_build_object(
            'velocidade', d.velocidade, 'resistencia', d.resistencia, 'chute', d.chute,
            'posicionamento', d.posicionamento, 'defesa', d.defesa, 'drible', d.drible,
            'passe', d.passe, 'fisico', d.fisico
          )
        )
        order by d.vez
      ) as jogadores
    from (
      select
        c.partida_id, p.inicio, j.id, j.name, j.position, j.ovr, j.image_url,
        j.velocidade, j.resistencia, j.chute, j.posicionamento, j.defesa, j.drible, j.passe, j.fisico,
        row_number() over (partition by c.partida_id order by j.ovr desc, j.name) as vez
      from public.presencas c
      join public.partidas p on p.id = c.partida_id
      join public.players j on j.id = c.jogador_id
      where p.grupo_id = grupo and p.id <> (prefixo || '0')::uuid and c.situacao = 'confirmado'
    ) d
    group by d.partida_id, d.inicio, case when (d.vez - 1) % 4 in (0, 3) then 1 else 2 end
  ) t
  group by t.partida_id;
end;
$$;

revoke execute on function public.resetar_demo() from public, anon, authenticated;
grant execute on function public.resetar_demo() to service_role;
