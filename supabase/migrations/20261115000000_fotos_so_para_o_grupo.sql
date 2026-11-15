-- ---------------------------------------------------------------------------
-- Only a Grupo's Membros can list its player photos.
--
-- "Public read player images" (20261110120000_harden_tenant_isolation.sql)
-- had no TO clause, so it applied to every role, anon included. With the
-- public anon key that ships in the browser, anyone could list the bucket's
-- folders (every Grupo's id), then each Grupo's photo files, and download
-- them. The per-user model kept it for photos under {user_id}/, and the
-- contract step (20261110220000_grupos_contract.sql) left it in place.
--
-- From here, SELECT on storage.objects in this bucket needs a papel in the
-- folder's Grupo. That covers what the app does with the bucket: the dono and
-- admins upload with upsert (which needs SELECT), remove files, and list the
-- folder when the fut is deleted. Showing a photo doesn't go through this
-- policy: the bucket stays public, and its public URLs skip RLS. So a photo
-- still opens for anyone holding its URL, which has the Grupo's and the
-- Jogador's ids in it, but nobody can find those URLs by listing any more.
-- Photos under the old {user_id}/ folders still open by URL and can no
-- longer be listed by anyone but the service role.
-- ---------------------------------------------------------------------------

drop policy "Public read player images" on storage.objects;

create policy "Grupo members read player images" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'player-images'
    and public.papel_no_grupo(public.grupo_da_pasta(name)) is not null
  );
