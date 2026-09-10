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
select ok((select relrowsecurity from pg_class where oid = 'public.site_campaigns'::regclass), 'site_campaigns has RLS enabled');

-- 2. Check date constraint (ends_at must be strictly greater than starts_at)
select throws_ok(
  $$insert into public.site_campaigns (site_id, name, preset, intensity, status, starts_at, ends_at)
    values ('20000000-0000-0000-0000-000000000001', 'Invalid Dates', 'navidad', 'balanced', 'draft', '2026-12-25T00:00:00Z', '2026-12-24T00:00:00Z')$$,
  '23514',
  null,
  'site_campaigns rejects inverted date range'
);

-- 3. Check preset constraint
select throws_ok(
  $$insert into public.site_campaigns (site_id, name, preset, intensity, status, starts_at, ends_at)
    values ('20000000-0000-0000-0000-000000000001', 'Invalid Preset', 'halloween', 'balanced', 'draft', '2026-10-01T00:00:00Z', '2026-10-31T00:00:00Z')$$,
  '23514',
  null,
  'site_campaigns rejects unsupported preset'
);

-- 4. Check intensity constraint
select throws_ok(
  $$insert into public.site_campaigns (site_id, name, preset, intensity, status, starts_at, ends_at)
    values ('20000000-0000-0000-0000-000000000001', 'Invalid Intensity', 'custom', 'extreme', 'draft', '2026-10-01T00:00:00Z', '2026-10-31T00:00:00Z')$$,
  '23514',
  null,
  'site_campaigns rejects unsupported intensity'
);

-- 5. Insert valid campaigns for Tenant A and Tenant B
insert into public.site_campaigns (id, site_id, name, preset, intensity, status, starts_at, ends_at) values
  ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 'Fiestas Patrias A', 'fiestas-patrias', 'festive', 'active', '2026-07-20T00:00:00Z', '2026-07-31T00:00:00Z'),
  ('40000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000001', 'Draft A', 'custom', 'subtle', 'draft', '2026-08-01T00:00:00Z', '2026-08-10T00:00:00Z'),
  ('40000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000002', 'Navidad B', 'navidad', 'balanced', 'scheduled', '2026-12-01T00:00:00Z', '2026-12-25T00:00:00Z');

-- 6. Anonymous access: can only see active or scheduled campaigns
set local role anon;
select results_eq(
  'select id from public.site_campaigns order by id',
  array['40000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000003'::uuid],
  'anon can only see active and scheduled campaigns (draft is hidden)'
);

-- 7. Authenticated User A: sees all campaigns for Tenant A, but draft of Tenant B is hidden
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select results_eq(
  'select id from public.site_campaigns where site_id = ''20000000-0000-0000-0000-000000000001'' order by id',
  array['40000000-0000-0000-0000-000000000001'::uuid, '40000000-0000-0000-0000-000000000002'::uuid],
  'User A sees own draft and active campaigns'
);

-- 8. User A cannot insert campaigns for Tenant B's site
select throws_ok(
  $$insert into public.site_campaigns (site_id, name, preset, intensity, status, starts_at, ends_at)
    values ('20000000-0000-0000-0000-000000000002', 'Hacked Campaign', 'custom', 'subtle', 'draft', '2026-09-01T00:00:00Z', '2026-09-10T00:00:00Z')$$,
  '42501',
  null,
  'User A cannot insert campaigns into Tenant B site'
);

-- 9. User A cannot delete campaigns belonging to Tenant B
delete from public.site_campaigns where id = '40000000-0000-0000-0000-000000000003';
select is(
  (select count(*) from public.site_campaigns where id = '40000000-0000-0000-0000-000000000003'),
  1::bigint,
  'User A deletion of Tenant B campaign is denied by RLS'
);

reset role;
select has_table_privilege('authenticated', 'public.site_campaigns', 'SELECT', 'authenticated can select campaigns');
select has_table_privilege('authenticated', 'public.site_campaigns', 'INSERT', 'authenticated can insert campaigns');

select * from finish();
rollback;
