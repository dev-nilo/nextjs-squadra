-- Convites: a Grupo's dono or admin shares a link; whoever opens it signs in
-- (or signs up) and joins as membro.

create table public.convites (
  id uuid primary key default gen_random_uuid(),
  grupo_id uuid not null references public.grupos(id) on delete cascade,
  -- 128 random bits, hex: unguessable and URL-safe. Only the Grupo's dono and
  -- admins can read it back; anyone else needs the link itself.
  token text not null unique default encode(extensions.gen_random_bytes(16), 'hex'),
  criado_por uuid default auth.uid() references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expira_em timestamptz not null default now() + interval '7 days',
  revogado_em timestamptz
);

create index convites_grupo_id_idx on public.convites(grupo_id);

alter table public.convites enable row level security;
alter table public.convites force row level security;

revoke all on table public.convites from anon, authenticated;
grant select, insert on table public.convites to authenticated;
-- Revoking is the only change: the token, the Grupo and the expiry never move.
grant update (revogado_em) on table public.convites to authenticated;

create policy "convites_select_gestor" on public.convites
  for select to authenticated
  using (public.papel_no_grupo(grupo_id) in ('dono', 'admin'));

create policy "convites_insert_gestor" on public.convites
  for insert to authenticated
  with check (
    criado_por = (select auth.uid())
    and public.papel_no_grupo(grupo_id) in ('dono', 'admin')
  );

create policy "convites_update_gestor" on public.convites
  for update to authenticated
  using (public.papel_no_grupo(grupo_id) in ('dono', 'admin'))
  with check (public.papel_no_grupo(grupo_id) in ('dono', 'admin'));

-- ---------------------------------------------------------------------------
-- What the link shows before joining, to anyone holding it (signed in or not):
-- whether it still works and, only then, the Grupo's name.
-- ---------------------------------------------------------------------------
create function public.ver_convite(token_do_convite text)
returns table (situacao text, grupo_nome text)
language sql
stable
security definer
set search_path = ''
as $$
  select
    case
      when c.id is null then 'inexistente'
      when c.revogado_em is not null then 'revogado'
      when c.expira_em <= now() then 'expirado'
      else 'valido'
    end,
    case when c.revogado_em is null and c.expira_em > now() then g.nome end
  from (select 1) as sempre_uma_linha
  left join public.convites c on c.token = token_do_convite
  left join public.grupos g on g.id = c.grupo_id;
$$;

-- ---------------------------------------------------------------------------
-- Joining. Idempotent: someone already in the Grupo keeps their papel.
-- Failures carry the reason in HINT (inexistente | revogado | expirado).
-- ---------------------------------------------------------------------------
create function public.aceitar_convite(token_do_convite text)
returns public.grupos
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  convite public.convites;
  grupo public.grupos;
begin
  if eu is null then
    raise exception 'aceitar_convite requires a signed-in user' using errcode = '28000';
  end if;

  select * into convite from public.convites c where c.token = token_do_convite;
  if convite.id is null then
    raise exception 'Convite não encontrado' using hint = 'inexistente';
  end if;
  if convite.revogado_em is not null then
    raise exception 'Esse convite foi cancelado' using hint = 'revogado';
  end if;
  if convite.expira_em <= now() then
    raise exception 'Esse convite expirou' using hint = 'expirado';
  end if;

  insert into public.grupo_membros (grupo_id, user_id, papel)
  values (convite.grupo_id, eu, 'membro')
  on conflict (grupo_id, user_id) do nothing;

  select * into grupo from public.grupos g where g.id = convite.grupo_id;
  return grupo;
end;
$$;

revoke execute on function public.ver_convite(text) from public;
grant execute on function public.ver_convite(text) to anon, authenticated;

revoke execute on function public.aceitar_convite(text) from public, anon;
grant execute on function public.aceitar_convite(text) to authenticated;
