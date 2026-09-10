begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(15);

-- Setup test users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000010', 'owner@example.test'),
  ('00000000-0000-0000-0000-000000000020', 'admin@example.test'),
  ('00000000-0000-0000-0000-000000000030', 'editor@example.test'),
  ('00000000-0000-0000-0000-000000000040', 'target@example.test'),
  ('00000000-0000-0000-0000-000000000099', 'outsider@example.test');

insert into public.tenants (id, name) values
  ('10000000-0000-0000-0000-000000000010', 'Audit Tenant');

insert into public.tenant_members (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000010', 'owner'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', 'admin'),
  ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000030', 'editor');

-- Test RLS enabled on audit_log
select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid = 'public.audit_log'::regclass), 'audit_log forces RLS');

-- Test as Editor: cannot insert audit log as another actor, cannot see audit log
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000030","role":"authenticated"}', true);
select is((select count(*) from public.audit_log), 0::bigint, 'editor cannot view audit log');

-- Editor cannot invite or mutate members
select throws_ok(
  $$insert into public.tenant_members (tenant_id, user_id, role) values ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000040', 'viewer')$$,
  '42501',
  null,
  'editor cannot add members'
);

-- Test as Admin: can add editor/viewer, cannot add owner
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000020","role":"authenticated"}', true);
select throws_ok(
  $$insert into public.tenant_members (tenant_id, user_id, role) values ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000040', 'owner')$$,
  '42501',
  null,
  'admin cannot add owner'
);

-- Admin can add editor
select lives_ok(
  $$insert into public.tenant_members (tenant_id, user_id, role) values ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000040', 'editor')$$,
  'admin can add editor'
);

-- Admin can write audit log for this event
select lives_ok(
  $$insert into public.audit_log (tenant_id, actor_user_id, action, resource_type, resource_id) values ('10000000-0000-0000-0000-000000000010', '00000000-0000-0000-0000-000000000020', 'member.added', 'tenant_member', '00000000-0000-0000-0000-000000000040')$$,
  'admin can record audit log'
);

-- Admin can view audit log
select is((select count(*) from public.audit_log), 1::bigint, 'admin can view tenant audit log');

-- Admin cannot update or delete audit log
select throws_ok($$update public.audit_log set action = 'tampered'$$, '42501', null, 'audit log is immutable to update');
select throws_ok($$delete from public.audit_log$$, '42501', null, 'audit log is immutable to delete');

-- Admin cannot modify owner's role
select throws_ok(
  $$update public.tenant_members set role = 'editor' where user_id = '00000000-0000-0000-0000-000000000010'$$,
  '42501',
  null,
  'admin cannot demote owner'
);

-- Test as Owner: can update roles and add owners
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000010","role":"authenticated"}', true);
select lives_ok(
  $$update public.tenant_members set role = 'admin' where user_id = '00000000-0000-0000-0000-000000000040'$$,
  'owner can update member role'
);

-- Test as Outsider: sees nothing
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000099","role":"authenticated"}', true);
select is((select count(*) from public.audit_log), 0::bigint, 'outsider sees no audit log');
select is((select count(*) from public.tenant_members), 0::bigint, 'outsider sees no memberships');

reset role;
select hasnt_table_privilege('authenticated', 'public.audit_log', 'UPDATE', 'authenticated has no audit update grant');
select hasnt_table_privilege('authenticated', 'public.audit_log', 'DELETE', 'authenticated has no audit delete grant');

select * from finish();
rollback;
