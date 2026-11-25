-- A version for each Jogador's card (#89).
--
-- Two tabs could save the same card from the same starting point. The second
-- save overwrote the first, and if they used photos at different paths, the
-- first save's cleanup could delete the photo the second one had just stored.
-- Now every card carries the version it was read at, the save only updates the
-- row while it still has that version, and a stale save is refused before it
-- writes anything. The cleanup only runs after a save that went through, and
-- the photo it deletes is the one that save replaced: no other tab can still
-- point the row at it.
--
-- The version goes up only when something on the card changes (what a save
-- writes). Linking or unlinking an account doesn't count, so a card being
-- edited isn't refused because someone said "sou eu" meanwhile. Clients can't
-- write the column: this trigger sets it on every insert (to 1) and update,
-- whatever the statement sent.

alter table public.players add column versao bigint not null default 1;

create function public.players_versao()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.versao := 1;
    return new;
  end if;
  if (new.name, new.position, new.nationality, new.image_url,
      new.velocidade, new.resistencia, new.chute, new.posicionamento,
      new.defesa, new.drible, new.passe, new.fisico)
    is distinct from
     (old.name, old.position, old.nationality, old.image_url,
      old.velocidade, old.resistencia, old.chute, old.posicionamento,
      old.defesa, old.drible, old.passe, old.fisico)
  then
    new.versao := old.versao + 1;
  else
    new.versao := old.versao;
  end if;
  return new;
end;
$$;

create trigger players_versao
  before insert or update on public.players
  for each row execute function public.players_versao();

revoke execute on function public.players_versao() from public, anon, authenticated;
