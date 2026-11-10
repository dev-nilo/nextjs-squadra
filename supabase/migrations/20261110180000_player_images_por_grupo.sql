-- Grupo step 3 (switch): the app now stores Jogador photos under
-- player-images/{grupo_id}/..., so whoever manages the Grupo's Elenco
-- (dono or admin) can upload, replace and remove them.
--
-- Additive on purpose: the {user_id}/ policies stay, so the deploy before this
-- one keeps working, and photos already stored there keep loading (the bucket
-- is public). They go away in step 5 (contract).

-- The first folder of an object's path as a Grupo id, or null when it isn't a
-- uuid. Casting inside the policy directly would raise on any other folder name.
create function public.grupo_da_pasta(nome_do_objeto text)
returns uuid
language sql
stable
set search_path = ''
as $$
  select case
    when (storage.foldername(nome_do_objeto))[1] ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then ((storage.foldername(nome_do_objeto))[1])::uuid
  end;
$$;

revoke execute on function public.grupo_da_pasta(text) from public, anon;
grant execute on function public.grupo_da_pasta(text) to authenticated;

create policy "Grupo managers upload player images" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'player-images'
    and public.papel_no_grupo(public.grupo_da_pasta(name)) in ('dono', 'admin')
  );

create policy "Grupo managers update player images" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'player-images'
    and public.papel_no_grupo(public.grupo_da_pasta(name)) in ('dono', 'admin')
  )
  with check (
    bucket_id = 'player-images'
    and public.papel_no_grupo(public.grupo_da_pasta(name)) in ('dono', 'admin')
  );

create policy "Grupo managers delete player images" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'player-images'
    and public.papel_no_grupo(public.grupo_da_pasta(name)) in ('dono', 'admin')
  );
