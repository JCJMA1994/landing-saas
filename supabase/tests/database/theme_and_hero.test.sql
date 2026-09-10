begin;
create extension if not exists pgtap with schema extensions;
set local search_path = public, extensions;
select plan(12);

-- Setup test users
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-000000000101', 'editor1@example.test'),
  ('00000000-0000-0000-0000-000000000102', 'viewer1@example.test'),
  ('00000000-0000-0000-0000-000000000199', 'outsider1@example.test');

insert into public.tenants (id, name) values
  ('10000000-0000-0000-0000-000000000100', 'Theme Tenant');

insert into public.tenant_members (tenant_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000101', 'editor'),
  ('10000000-0000-0000-0000-000000000100', '00000000-0000-0000-0000-000000000102', 'viewer');

insert into public.sites (id, tenant_id, slug, name) values
  ('20000000-0000-0000-0000-000000000100', '10000000-0000-0000-0000-000000000100', 'theme-site', 'Theme Site');

select ok((select bool_and(relrowsecurity and relforcerowsecurity) from pg_class where oid in ('public.site_theme'::regclass, 'public.site_hero'::regclass)), 'theme and hero force RLS');

-- Constraints check
select throws_ok(
  $$insert into public.site_theme (site_id, primary_color, secondary_color, accent_color, background_color, text_color, font_key, radius_key, button_variant, card_variant) values ('20000000-0000-0000-0000-000000000100', 'not-a-color', '#ffffff', '#ffffff', '#000000', '#ffffff', 'inter', 'subtle', 'solid', 'flat')$$,
  '23514',
  null,
  'rejects invalid hex color'
);

select throws_ok(
  $$insert into public.site_hero (site_id, headline, subheadline, cta_text, cta_link) values ('20000000-0000-0000-0000-000000000100', 'Headline', 'Subheadline', 'Click', 'javascript:alert(1)')$$,
  '23514',
  null,
  'rejects javascript link'
);

-- Test as Viewer: can read, cannot insert/update
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000102","role":"authenticated"}', true);

select throws_ok(
  $$insert into public.site_theme (site_id, primary_color, secondary_color, accent_color, background_color, text_color, font_key, radius_key, button_variant, card_variant) values ('20000000-0000-0000-0000-000000000100', '#112233', '#445566', '#778899', '#000000', '#ffffff', 'inter', 'subtle', 'solid', 'flat')$$,
  '42501',
  null,
  'viewer cannot insert theme'
);

select throws_ok(
  $$insert into public.site_hero (site_id, headline, subheadline, cta_text, cta_link) values ('20000000-0000-0000-0000-000000000100', 'Headline', 'Subheadline', 'Click', 'https://example.com')$$,
  '42501',
  null,
  'viewer cannot insert hero'
);

-- Test as Editor: can insert and update
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000101","role":"authenticated"}', true);

select lives_ok(
  $$insert into public.site_theme (site_id, primary_color, secondary_color, accent_color, background_color, text_color, font_key, radius_key, button_variant, card_variant) values ('20000000-0000-0000-0000-000000000100', '#112233', '#445566', '#778899', '#0a0f1e', '#f5f7ff', 'inter', 'subtle', 'solid', 'flat')$$,
  'editor can insert theme'
);

select lives_ok(
  $$insert into public.site_hero (site_id, headline, subheadline, cta_text, cta_link) values ('20000000-0000-0000-0000-000000000100', 'Top SaaS Solution', 'Empowering your workflow', 'Get Started', 'https://example.com/signup')$$,
  'editor can insert hero'
);

select lives_ok(
  $$update public.site_theme set primary_color = '#224466' where site_id = '20000000-0000-0000-0000-000000000100'$$,
  'editor can update theme'
);

-- Test as Outsider: cannot see or mutate
select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000199","role":"authenticated"}', true);
select is((select count(*) from public.site_theme), 0::bigint, 'outsider sees no site_theme');
select is((select count(*) from public.site_hero), 0::bigint, 'outsider sees no site_hero');

reset role;
select hasnt_table_privilege('authenticated', 'public.site_theme', 'DELETE', 'authenticated has no delete privilege on site_theme');
select hasnt_table_privilege('authenticated', 'public.site_hero', 'DELETE', 'authenticated has no delete privilege on site_hero');

select * from finish();
rollback;
