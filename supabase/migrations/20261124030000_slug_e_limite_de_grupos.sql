-- ---------------------------------------------------------------------------
-- Grupo slugs stop counting, and an account creates at most 5 Grupos (#85).
--
-- criar_grupo added -2, -3… to a slug that was taken, so a new Grupo's slug
-- told anyone how many other Grupos had the same name. A taken slug now gets a
-- random 6-character suffix instead.
--
-- Any account could also create Grupos without limit, and each one gets its
-- own folder for photos. The owner set the limit on 2026-11-24: an account may
-- be dono of at most 5 Grupos when it creates one. It's a check on creating
-- only: being handed a Grupo (passar_posse) still works past it. Two calls at
-- once from one account take turns on an advisory lock keyed by the account,
-- so both can't pass the count together. The app itself never creates a second
-- Grupo for anyone (lib/acoes/grupo.ts hands back the first), so only a direct
-- API call reaches the limit.
-- ---------------------------------------------------------------------------

create or replace function public.criar_grupo(nome_do_grupo text)
returns public.grupos
language plpgsql
security definer
set search_path = ''
as $$
declare
  eu uuid := (select auth.uid());
  limpo text := btrim(coalesce(nome_do_grupo, ''));
  base text;
  candidato text;
  novo public.grupos;
begin
  if eu is null then
    raise exception 'criar_grupo requires a signed-in user' using errcode = '28000';
  end if;
  if char_length(limpo) not between 1 and 60 then
    raise exception 'O nome do fut precisa ter entre 1 e 60 caracteres' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('criar_grupo:' || eu::text, 0));
  if (select count(*) from public.grupo_membros m where m.user_id = eu and m.papel = 'dono') >= 5 then
    raise exception 'Você já organiza 5 futs, o limite por conta' using hint = 'limite-de-grupos';
  end if;

  base := coalesce(nullif(public.slug_para(limpo), ''), 'fut');
  candidato := base;
  loop
    begin
      insert into public.grupos (slug, nome, criado_por)
      values (candidato, limpo, eu)
      returning * into novo;
      exit;
    exception when unique_violation then
      candidato := base || '-' || pg_catalog.substr(pg_catalog.md5(pg_catalog.gen_random_uuid()::text), 1, 6);
    end;
  end loop;

  insert into public.grupo_membros (grupo_id, user_id, papel) values (novo.id, eu, 'dono');

  return novo;
end;
$$;
