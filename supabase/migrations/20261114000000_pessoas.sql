-- People and the fut itself: who's in it with which papel, and the dono's
-- powers over both. Until now RLS let the dono update grupo_membros and
-- grupos directly; the rules lived in policies and nothing could express
-- "never zero or two donos" or "leaving unlinks your Jogador". From here every
-- change goes through one function per action, with its rules inside, and the
-- direct writes are closed.
--
-- Refusals carry the reason in HINT, for the app's error table:
--   sem-permissao     the caller's papel can't do this
--   nao-membro        the caller isn't in this Grupo
--   pessoa-fora       the target person isn't in this Grupo
--   e-o-dono          the target is the dono (nobody changes or removes them)
--   e-voce            the dono aimed at themselves
--   so-para-admin     ownership goes only to an admin
--   dono-nao-sai      the dono must hand over the fut before leaving
--   nome-nao-confere  the typed name doesn't match the fut's

-- ---------------------------------------------------------------------------
-- Close the direct writes. Reads stay as they are.
-- ---------------------------------------------------------------------------
drop policy "grupo_membros_update_dono" on public.grupo_membros;
drop policy "grupo_membros_delete" on public.grupo_membros;
revoke update (papel) on table public.grupo_membros from authenticated;
drop policy "grupos_update_dono" on public.grupos;
drop policy "grupos_delete_dono" on public.grupos;

-- The caller, signed in and in the Grupo, with their papel. Raises otherwise.
create function public.exigir_papel(grupo uuid)
returns public.papel_grupo
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  papel public.papel_grupo;
begin
  if (select auth.uid()) is null then
    raise exception 'Requires a signed-in user' using errcode = '28000';
  end if;
  papel := public.papel_no_grupo(grupo);
  if papel is null then
    raise exception 'Fut não encontrado' using hint = 'nao-membro';
  end if;
  return papel;
end;
$$;

-- ---------------------------------------------------------------------------
-- Who's in the fut. Every Membro sees everyone's name (their linked
-- Jogador's) and papel; only the dono and admins see emails, to tell apart
-- people with no Jogador yet.
-- ---------------------------------------------------------------------------
create function public.pessoas_do_grupo(grupo uuid)
returns table (user_id uuid, papel public.papel_grupo, desde timestamptz, jogador_id uuid, jogador_nome text, email text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  meu public.papel_grupo := public.exigir_papel(grupo);
begin
  return query
    select
      m.user_id,
      m.papel,
      m.created_at,
      p.id,
      p.name,
      case when meu in ('dono', 'admin') then u.email::text end
    from public.grupo_membros m
    join auth.users u on u.id = m.user_id
    left join public.players p on p.grupo_id = m.grupo_id and p.conta_id = m.user_id
    where m.grupo_id = grupo
    order by
      case m.papel when 'dono' then 0 when 'admin' then 1 else 2 end,
      p.name nulls last,
      m.created_at;
end;
$$;

-- ---------------------------------------------------------------------------
-- The dono makes someone admin or membro.
-- ---------------------------------------------------------------------------
create function public.mudar_papel(grupo uuid, pessoa uuid, novo public.papel_grupo)
returns public.grupo_membros
language plpgsql
security definer
set search_path = ''
as $$
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
$$;

-- Someone leaves the Grupo: their Jogador stays in the Elenco (with its
-- presences) but is no longer theirs. Shared by remover and sair.
create function public.desligar_do_grupo(grupo uuid, pessoa uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.players set conta_id = null, updated_at = now() where grupo_id = grupo and conta_id = pessoa;
  delete from public.grupo_membros where grupo_id = grupo and user_id = pessoa;
$$;

-- ---------------------------------------------------------------------------
-- The dono removes someone. A still-valid Convite lets them back in; the
-- Convites are on the same page to cancel.
-- ---------------------------------------------------------------------------
create function public.remover_do_grupo(grupo uuid, pessoa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  alvo public.grupo_membros;
begin
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono remove pessoas' using hint = 'sem-permissao';
  end if;
  if pessoa = (select auth.uid()) then
    raise exception 'O dono não se remove' using hint = 'e-voce';
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
$$;

-- ---------------------------------------------------------------------------
-- A membro or admin leaves. The dono hands the fut over first.
-- ---------------------------------------------------------------------------
create function public.sair_do_grupo(grupo uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.exigir_papel(grupo) = 'dono' then
    raise exception 'Passe o fut pra um admin antes de sair' using hint = 'dono-nao-sai';
  end if;
  perform public.desligar_do_grupo(grupo, (select auth.uid()));
end;
$$;

-- ---------------------------------------------------------------------------
-- The dono hands the fut to an admin and becomes an admin. One transaction:
-- the Grupo row is locked, the dono steps down first (the unique index allows
-- one dono at a time), then the admin steps up. Never zero, never two.
-- ---------------------------------------------------------------------------
create function public.passar_posse(grupo uuid, pessoa uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  alvo public.grupo_membros;
begin
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
$$;

-- ---------------------------------------------------------------------------
-- The dono renames the fut. The slug never changes (links keep working).
-- ---------------------------------------------------------------------------
create function public.renomear_grupo(grupo uuid, nome text)
returns public.grupos
language plpgsql
security definer
set search_path = ''
as $$
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
  update public.grupos g set nome = limpo where g.id = grupo returning * into atualizado;
  return atualizado;
end;
$$;

-- ---------------------------------------------------------------------------
-- The dono deletes the fut, typing its name to confirm (checked here too, so
-- no client can skip it). Everything goes with it: Membros, Elenco, Partidas,
-- Convites (on delete cascade). The app removes the photos from Storage
-- before calling this.
-- ---------------------------------------------------------------------------
create function public.excluir_grupo(grupo uuid, confirmacao text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  atual text;
begin
  if public.exigir_papel(grupo) <> 'dono' then
    raise exception 'Só o dono exclui o fut' using hint = 'sem-permissao';
  end if;
  select g.nome into atual from public.grupos g where g.id = grupo for update;
  if lower(btrim(coalesce(confirmacao, ''))) <> lower(btrim(atual)) then
    raise exception 'O nome não confere' using hint = 'nome-nao-confere';
  end if;
  delete from public.grupos g where g.id = grupo;
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants: only signed-in users call the actions; the helpers aren't callable.
-- ---------------------------------------------------------------------------
revoke execute on function public.exigir_papel(uuid) from public, anon, authenticated;
revoke execute on function public.desligar_do_grupo(uuid, uuid) from public, anon, authenticated;

revoke execute on function public.pessoas_do_grupo(uuid) from public, anon;
revoke execute on function public.mudar_papel(uuid, uuid, public.papel_grupo) from public, anon;
revoke execute on function public.remover_do_grupo(uuid, uuid) from public, anon;
revoke execute on function public.sair_do_grupo(uuid) from public, anon;
revoke execute on function public.passar_posse(uuid, uuid) from public, anon;
revoke execute on function public.renomear_grupo(uuid, text) from public, anon;
revoke execute on function public.excluir_grupo(uuid, text) from public, anon;

grant execute on function public.pessoas_do_grupo(uuid) to authenticated;
grant execute on function public.mudar_papel(uuid, uuid, public.papel_grupo) to authenticated;
grant execute on function public.remover_do_grupo(uuid, uuid) to authenticated;
grant execute on function public.sair_do_grupo(uuid) to authenticated;
grant execute on function public.passar_posse(uuid, uuid) to authenticated;
grant execute on function public.renomear_grupo(uuid, text) to authenticated;
grant execute on function public.excluir_grupo(uuid, text) to authenticated;
