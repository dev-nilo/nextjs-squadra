-- Public bucket for player card photos (URLs instead of base64 in DB / localStorage)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'player-images',
  'player-images',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Anyone can view (public URLs)
drop policy if exists "Public read player images" on storage.objects;
create policy "Public read player images"
on storage.objects for select
using (bucket_id = 'player-images');

-- Authenticated users can upload/overwrite only inside their own folder: {user_id}/...
drop policy if exists "Users upload own player images" on storage.objects;
create policy "Users upload own player images"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'player-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users update own player images" on storage.objects;
create policy "Users update own player images"
on storage.objects for update
to authenticated
using (
  bucket_id = 'player-images'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'player-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users delete own player images" on storage.objects;
create policy "Users delete own player images"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'player-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
