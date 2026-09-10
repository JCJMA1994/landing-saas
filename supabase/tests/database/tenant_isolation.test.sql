begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(18);

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000001', 'a@example.test'),
  ('00000000-0000-0000-0000-000000000002', 'b@example.test'),
  ('00000000-0000-0000-0000-000000000003', 'outsider@example.test');
insert into public.tenants (id, name) values
  ('10000000-0000-0000-0000-000000000001', 'Tenant A'),
  ('10000000-0000-0000-0000-000000000002', 'Tenant B');
insert into public.tenant_members (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'editor'),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000002', 'owner');
insert into public.sites (id, tenant_id, slug, name) values
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'main', 'Site A'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'main', 'Site B');

select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in ('public.tenants'::regclass, 'public.tenant_members'::regclass, 'public.sites'::regclass)), 'core tables force RLS');
select throws_ok($$insert into public.sites (tenant_id, slug, name) values ('10000000-0000-0000-0000-000000000099', 'orphan', 'Orphan')$$, '23503', null, 'site requires an existing tenant');
select throws_ok($$insert into public.sites (tenant_id, slug, name) values ('10000000-0000-0000-0000-000000000001', '../unsafe', 'Unsafe')$$, '23514', null, 'slug rejects path input');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000001","role":"authenticated"}', true);
select results_eq('select id from public.tenants order by id', array['10000000-0000-0000-0000-000000000001'::uuid], 'A sees only tenant A');
select results_eq('select id from public.sites order by id', array['20000000-0000-0000-0000-000000000001'::uuid], 'A sees only site A');
select results_eq('select user_id from public.tenant_members order by user_id', array['00000000-0000-0000-0000-000000000001'::uuid], 'A sees only its membership');
select is((select count(*) from public.sites where id = '20000000-0000-0000-0000-000000000002'), 0::bigint, 'guessed site ID does not authorize');
select is((select count(*) from public.sites where tenant_id = '10000000-0000-0000-0000-000000000002'), 0::bigint, 'client tenant ID does not authorize');
select throws_ok($$insert into public.tenants (name) values ('Unauthorized')$$, '42501', null, 'authenticated cannot create tenants');
select throws_ok($$insert into public.tenant_members (tenant_id, user_id, role) values ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'owner')$$, '42501', null, 'A cannot self-enroll in B');
select throws_ok($$update public.tenant_members set role = 'owner'$$, '42501', null, 'A cannot elevate role');
select throws_ok($$insert into public.sites (tenant_id, slug, name) values ('10000000-0000-0000-0000-000000000001', 'new', 'New')$$, '42501', null, 'own-tenant write is denied');

select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000003","role":"authenticated"}', true);
select is((select count(*) from public.tenants), 0::bigint, 'outsider sees no tenants');
select is((select count(*) from public.sites), 0::bigint, 'outsider sees no sites');
select is((select count(*) from public.tenant_members), 0::bigint, 'outsider sees no memberships');

reset role;
select hasnt_table_privilege('anon', 'public.tenants', 'SELECT', 'anon cannot read tenants');
select hasnt_table_privilege('anon', 'public.sites', 'SELECT', 'anon cannot read sites');
select hasnt_table_privilege('authenticated', 'public.sites', 'INSERT', 'authenticated has no site insert privilege');

select * from finish();
rollback;
