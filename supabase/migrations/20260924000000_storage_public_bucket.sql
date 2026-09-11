-- Migration: 20260924000000_storage_public_bucket.sql
-- Purpose: Configure site-assets storage bucket as public and allow public read access for uploaded images.

begin;

-- 1. Ensure site-assets bucket is marked public
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

-- 2. Grant public read on storage.objects for site-assets bucket
drop policy if exists "site_assets_public_select" on storage.objects;
create policy "site_assets_public_select" on storage.objects
  for select
  using (bucket_id = 'site-assets');

-- 3. Ensure authenticated users can upload and manage site-assets
drop policy if exists "site_assets_auth_insert" on storage.objects;
create policy "site_assets_auth_insert" on storage.objects
  for insert
  to authenticated
  with check (bucket_id = 'site-assets');

drop policy if exists "site_assets_auth_update" on storage.objects;
create policy "site_assets_auth_update" on storage.objects
  for update
  to authenticated
  using (bucket_id = 'site-assets');

drop policy if exists "site_assets_auth_delete" on storage.objects;
create policy "site_assets_auth_delete" on storage.objects
  for delete
  to authenticated
  using (bucket_id = 'site-assets');

commit;
