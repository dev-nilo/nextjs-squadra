-- A Jogador can be linked to the account of the person it represents
-- ("sou esse aqui"), so later slices know who is confirming presence. A
-- Jogador with no account stays a normal Jogador.

alter table public.players
  add column conta_id uuid references auth.users(id) on delete set null;

-- One Jogador per account per Grupo.
create unique index players_uma_conta_por_grupo_idx
  on public.players (grupo_id, conta_id)
  where conta_id is not null;

-- Nobody writes conta_id directly, not even the Grupo's admins: linking
-- someone else's account to a Jogador would let an admin speak for them. It
-- changes only through the functions below. Updates already exclude it
-- (column grants from the contract step); inserts need the policy to say so.
drop policy "players_insert_gestor" on public.players;
create policy "players_insert_gestor" on public.players
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and conta_id is null
    and public.papel_no_grupo(grupo_id) in ('dono', 'admin')
  );

-- ---------------------------------------------------------------------------
-- "Sou esse aqui": a Membro links their account to a Jogador with none.
-- Refusals carry the reason in HINT: nao-membro | ja-vinculado | ja-tem-jogador.
-- ---------------------------------------------------------------------------
create function public.vincular_jogador(jogador uuid)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  alvo public.players;
begin
  if eu is null then
    raise exception 'vincular_jogador requires a signed-in user' using errcode = '28000';
  end if;

  -- Lock the row so two people can't claim the same Jogador at once.
  select * into alvo from public.players p where p.id = jogador for update;
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
$$;

-- ---------------------------------------------------------------------------
-- "Não estou na lista": a Membro (any papel) adds themselves to the Elenco,
-- with the default attributes, already linked to their account.
-- ---------------------------------------------------------------------------
create function public.criar_meu_jogador(grupo uuid, nome text, posicao text)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
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
  if exists (select 1 from public.players p where p.grupo_id = grupo and p.conta_id = eu) then
    raise exception 'Você já tem um Jogador nesse fut' using hint = 'ja-tem-jogador';
  end if;

  insert into public.players (user_id, grupo_id, conta_id, name, position)
  values (eu, grupo, eu, limpo, posicao)
  returning * into novo;
  return novo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Unlinking: the Grupo's dono or admin, or the linked person themselves.
-- The Jogador stays in the Elenco.
-- ---------------------------------------------------------------------------
create function public.desvincular_jogador(jogador uuid)
returns public.players
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  alvo public.players;
begin
  if eu is null then
    raise exception 'desvincular_jogador requires a signed-in user' using errcode = '28000';
  end if;

  select * into alvo from public.players p where p.id = jogador for update;
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
$$;

revoke execute on function public.vincular_jogador(uuid) from public, anon;
revoke execute on function public.criar_meu_jogador(uuid, text, text) from public, anon;
revoke execute on function public.desvincular_jogador(uuid) from public, anon;
grant execute on function public.vincular_jogador(uuid) to authenticated;
grant execute on function public.criar_meu_jogador(uuid, text, text) to authenticated;
grant execute on function public.desvincular_jogador(uuid) to authenticated;
