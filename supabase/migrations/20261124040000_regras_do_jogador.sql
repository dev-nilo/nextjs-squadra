-- ---------------------------------------------------------------------------
-- The table enforces the Jogador's input rules (#84), and a card can't point at
-- a photo that isn't there (#89).
--
-- Name length, position, nationality and the photo's origin were checked only
-- by jogadorSchema and salvarJogador (lib/jogador.ts, lib/acoes/jogador.ts). A
-- dono or admin writing to the table directly could save a 500-character name,
-- an unknown position, or an image_url from another site.
--
-- Name, position and nationality become CHECK constraints with the app's
-- rules, checked against every existing row as they're added. If some old row
-- in production breaks one, this migration fails as a whole, inside its
-- transaction: nothing changes, the code deploy after it doesn't run, and the
-- error names the constraint. (A NOT VALID constraint with a warning was the
-- first idea, but the CLI doesn't print migration warnings, so a constraint
-- left unvalidated would go unnoticed.)
--
-- The photo gets a trigger: a new or changed image_url must be a public URL of
-- a file in this Grupo's folder of the player-images bucket
-- (<grupo_id>/<file>), and that file must exist. The database doesn't know
-- its own public address, so the URL's host is still checked by the Server
-- Action only. Unchanged URLs aren't checked, so old cards keep saving.
--
-- The file having to exist also narrows #89: two tabs editing one card, tab A
-- replacing the photo with a file at another path, and tab B then saving the
-- old URL. Once A's cleanup has deleted the old file, B's save fails instead of
-- pointing the card at a deleted file. In the moment between A's update and
-- A's cleanup the old file still exists, so #89 stays open.
-- ---------------------------------------------------------------------------

alter table public.players
  add constraint players_nome_1_a_40 check (char_length(btrim(name)) between 1 and 40),
  add constraint players_posicao_conhecida check (position in ('GOL', 'FIX', 'ALA', 'ATA')),
  add constraint players_nacionalidade_iso check (nationality ~ '^[A-Z]{2}$');

create function public.players_foto_do_grupo()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  caminho text;
begin
  if new.image_url is null or (tg_op = 'UPDATE' and new.image_url is not distinct from old.image_url) then
    return new;
  end if;

  caminho := pg_catalog.substring(new.image_url, '^https?://[^/?#]+/storage/v1/object/public/player-images/([^?#]+)(\?[^#]*)?$');
  if caminho is null
    or caminho !~ ('^' || new.grupo_id::text || '/[^/%]+$')
    or not exists (select 1 from storage.objects o where o.bucket_id = 'player-images' and o.name = caminho)
  then
    raise exception 'Não deu pra usar essa foto' using errcode = '23514', hint = 'foto-invalida';
  end if;
  return new;
end;
$$;

create trigger players_foto_do_grupo
  before insert or update of image_url on public.players
  for each row execute function public.players_foto_do_grupo();

revoke execute on function public.players_foto_do_grupo() from public, anon, authenticated;
