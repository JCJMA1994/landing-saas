begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(11);

-- Setup test users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000301', 'editor3@example.test'),
  ('00000000-0000-0000-0000-000000000302', 'viewer3@example.test'),
  ('00000000-0000-0000-0000-000000000399', 'outsider3@example.test');

insert into public.tenants (id, name) values
  ('10000000-0000-0000-0000-000000000300', 'Media Tenant');

insert into public.tenant_members (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000301', 'editor'),
  ('10000000-0000-0000-0000-000000000300', '00000000-0000-0000-0000-000000000302', 'viewer');

insert into public.sites (id, tenant_id, slug, name) values
  ('20000000-0000-0000-0000-000000000300', '10000000-0000-0000-0000-000000000300', 'media-site', 'Media Site');

select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid = 'public.media_assets'::regclass), 'media_assets forces RLS');

-- Constraints checks
select throws_ok(
  $$insert into public.media_assets (tenant_id, site_id, file_path, mime_type, file_size_bytes, alt_text) values ('10000000-0000-0000-0000-000000000300', '20000000-0000-0000-0000-000000000300', 'path/to/file.svg', 'image/svg+xml', 1000, 'Logo')$$,
  '23514',
  null,
  'rejects disallowed mime type svg'
);

select throws_ok(
  $$insert into public.media_assets (tenant_id, site_id, file_path, mime_type, file_size_bytes, alt_text) values ('10000000-0000-0000-0000-000000000300', '20000000-0000-0000-0000-000000000300', 'path/to/huge.jpg', 'image/jpeg', 10000000, 'Huge')$$,
  '23514',
  null,
  'rejects oversized media above 5MB'
);

-- Test as Viewer: can read, cannot insert/delete
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000302","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.media_assets (tenant_id, site_id, file_path, mime_type, file_size_bytes, alt_text) values ('10000000-0000-0000-0000-000000000300', '20000000-0000-0000-0000-000000000300', 'path/1.png', 'image/png', 2048, 'Asset')$$,
  '42501',
  null,
  'viewer cannot insert media asset'
);

-- Test as Editor: can insert and delete
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000301","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.media_assets (id, tenant_id, site_id, file_path, mime_type, file_size_bytes, alt_text) values ('50000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000300', '20000000-0000-0000-0000-000000000300', '10000000-0000-0000-0000-000000000300/20000000-0000-0000-0000-000000000300/hero.webp', 'image/webp', 4096, 'Hero Visual')$$,
  'editor can insert media asset'
);

select is((select count(*) from public.media_assets), 1::bigint, 'editor sees media asset');

select lives_ok(
  $$delete from public.media_assets where id = '50000000-0000-0000-0000-000000000301'$$,
  'editor can delete media asset'
);

-- Test as Outsider
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000399","role":"authenticated"}', true);
select is((select count(*) from public.media_assets), 0::bigint, 'outsider sees no media assets');

reset role;
select hasnt_table_privilege('authenticated', 'public.media_assets', 'UPDATE', 'authenticated has no media update grant');

select * from finish();
rollback;
