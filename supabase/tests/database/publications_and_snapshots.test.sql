begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(11);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'editor-a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'editor-b@example.test');

insert into public.tenants (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Tenant A'),
  ('10000000-0000-0000-0000-000000000002', 'Tenant B');

insert into public.tenant_members (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'editor'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'editor');

insert into public.sites (id, tenant_id, slug, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'site-a', 'Site A'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'site-b', 'Site B');

-- 1. Table exists and has RLS enabled
select ok((select relrowsecurity from pg_class where oid = 'public.site_publications'::regclass), 'site_publications has RLS enabled');

-- 2. Insert publications (one inactive v1, one active v2 for Site A)
insert into public.site_publications (id, site_id, version, snapshot, checksum, published_by, is_active) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 1, '{"v":1}'::jsonb, 'hash1', '00000000-0000-0000-0000-000000000001', false),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 2, '{"v":2}'::jsonb, 'hash2', '00000000-0000-0000-0000-000000000001', true);

-- 3. Unique partial index test: cannot have two active publications for the same site
select throws_ok(
  $$insert into public.site_publications (site_id, version, snapshot, checksum, published_by, is_active) values ('20000000-0000-0000-0000-000000000001', 3, '{"v":3}'::jsonb, 'hash3', '00000000-0000-0000-0000-000000000001', true)$$,
  '23505',
  null,
  'partial unique index rejects multiple active publications'
);

-- 4. Inactive publications for Tenant B
insert into public.site_publications (id, site_id, version, snapshot, checksum, published_by, is_active) values
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 1, '{"v":1}'::jsonb, 'hashb1', '00000000-0000-0000-0000-000000000002', false);

-- 5. Test anonymous access: can only view active publications
set local role anon;
select results_eq(
  'select id from public.site_publications order by id',
  array['30000000-0000-0000-0000-000000000002'::uuid],
  'anon can only see active publication'
);

-- 6. Test authenticated User A: sees all publications of Site A, but none of Site B
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select results_eq(
  'select id from public.site_publications where site_id = ''20000000-0000-0000-0000-000000000001'' order by version',
  array['30000000-0000-0000-0000-000000000001'::uuid, '30000000-0000-0000-0000-000000000002'::uuid],
  'User A sees full publication history for own site'
);
select is(
  (select count(*) from public.site_publications where site_id = '20000000-0000-0000-0000-000000000002' and is_active = false),
  0::bigint,
  'User A cannot see inactive draft/historical publications of Tenant B'
);

-- 7. Test DELETE revocation (immutability guarantee ADR 0002)
select throws_ok(
  $$delete from public.site_publications where id = '30000000-0000-0000-0000-000000000001'$$,
  '42501',
  null,
  'DELETE is revoked on site_publications for authenticated users'
);

reset role;
select hasnt_table_privilege('anon', 'public.site_publications', 'DELETE', 'anon has no DELETE privilege');
select hasnt_table_privilege('authenticated', 'public.site_publications', 'DELETE', 'authenticated has no DELETE privilege');
select has_table_privilege('authenticated', 'public.site_publications', 'INSERT', 'authenticated can insert publications');
select has_table_privilege('authenticated', 'public.site_publications', 'SELECT', 'authenticated can select publications');

select * from finish();
rollback;
