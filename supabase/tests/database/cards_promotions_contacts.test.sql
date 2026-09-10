begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(14);

-- Setup test users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000201', 'editor2@example.test'),
  ('00000000-0000-0000-0000-000000000202', 'viewer2@example.test'),
  ('00000000-0000-0000-0000-000000000299', 'outsider2@example.test');

insert into public.tenants (id, name) values
  ('10000000-0000-0000-0000-000000000200', 'Modules Tenant');

insert into public.tenant_members (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000201', 'editor'),
  ('10000000-0000-0000-0000-000000000200', '00000000-0000-0000-0000-000000000202', 'viewer');

insert into public.sites (id, tenant_id, slug, name) values
  ('20000000-0000-0000-0000-000000000200', '10000000-0000-0000-0000-000000000200', 'modules-site', 'Modules Site');

select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in ('public.site_cards'::regclass, 'public.site_promotions'::regclass, 'public.site_contacts'::regclass)), 'all tables force RLS');

-- Constraints checks
select throws_ok(
  $$insert into public.site_contacts (site_id, whatsapp_number) values ('20000000-0000-0000-0000-000000000200', '12345')$$,
  '23514',
  null,
  'rejects invalid non-E164 whatsapp number'
);

select throws_ok(
  $$insert into public.site_promotions (site_id, title, description, starts_at, ends_at) values ('20000000-0000-0000-0000-000000000200', 'Bad Promo', 'Invalid dates', now() + interval '2 days', now() + interval '1 day')$$,
  '23514',
  null,
  'rejects ends_at before starts_at'
);

-- Test as Viewer: can read, cannot insert/update/delete
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000202","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.site_cards (site_id, title, description, icon_key) values ('20000000-0000-0000-0000-000000000200', 'Feature', 'Desc', 'star')$$,
  '42501',
  null,
  'viewer cannot insert card'
);

select throws_ok(
  $$insert into public.site_promotions (site_id, title, description) values ('20000000-0000-0000-0000-000000000200', 'Promo', 'Desc')$$,
  '42501',
  null,
  'viewer cannot insert promotion'
);

select throws_ok(
  $$insert into public.site_contacts (site_id, whatsapp_number) values ('20000000-0000-0000-0000-000000000200', '+5491122334455')$$,
  '42501',
  null,
  'viewer cannot insert contacts'
);

-- Test as Editor: can insert, update and delete
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000201","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.site_cards (id, site_id, title, description, icon_key) values ('30000000-0000-0000-0000-000000000201', '20000000-0000-0000-0000-000000000200', 'Diagnostics', 'Deep scan system', 'wrench')$$,
  'editor can insert card'
);

select lives_ok(
  $$insert into public.site_promotions (id, site_id, title, description, discount_label) values ('40000000-0000-0000-0000-000000000201', '20000000-0000-0000-0000-000000000200', 'Spring Sale', 'Limited discount', '20% OFF')$$,
  'editor can insert promotion'
);

select lives_ok(
  $$insert into public.site_contacts (site_id, whatsapp_number, whatsapp_message) values ('20000000-0000-0000-0000-000000000200', '+5491122334455', 'Hello from SaaS')$$,
  'editor can insert contacts'
);

select lives_ok(
  $$update public.site_contacts set instagram_handle = 'mysaas_official' where site_id = '20000000-0000-0000-0000-000000000200'$$,
  'editor can update contacts'
);

select lives_ok(
  $$delete from public.site_cards where id = '30000000-0000-0000-0000-000000000201'$$,
  'editor can delete card'
);

-- Test as Outsider: zero rows visible
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000299","role":"authenticated"}', true);
select is((select count(*) from public.site_cards), 0::bigint, 'outsider sees no cards');
select is((select count(*) from public.site_promotions), 0::bigint, 'outsider sees no promotions');
select is((select count(*) from public.site_contacts), 0::bigint, 'outsider sees no contacts');

select * from finish();
rollback;
