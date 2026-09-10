begin;

create table public.site_theme (
  site_id uuid primary key references public.sites(id) on delete cascade,
  primary_color text not null check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  secondary_color text not null check (secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text not null check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  background_color text not null check (background_color ~ '^#[0-9a-fA-F]{6}$'),
  text_color text not null check (text_color ~ '^#[0-9a-fA-F]{6}$'),
  font_key text not null check (font_key in ('inter', 'roboto', 'outfit', 'space-grotesk')),
  radius_key text not null check (radius_key in ('sharp', 'subtle', 'rounded', 'pill')),
  button_variant text not null check (button_variant in ('solid', 'outline', 'ghost', 'gradient')),
  card_variant text not null check (card_variant in ('flat', 'elevated', 'bordered', 'glass')),
  updated_at timestamptz not null default now()
);

create table public.site_hero (
  site_id uuid primary key references public.sites(id) on delete cascade,
  headline text not null check (char_length(btrim(headline)) between 1 and 160),
  subheadline text not null check (char_length(btrim(subheadline)) between 1 and 320),
  cta_text text not null check (char_length(btrim(cta_text)) between 1 and 40),
  cta_link text not null check (char_length(btrim(cta_link)) between 1 and 256 and cta_link ~ '^(https?://|/|mailto:|tel:|#).*'),
  badge_text text check (badge_text is null or char_length(btrim(badge_text)) between 1 and 60),
  updated_at timestamptz not null default now()
);

alter table public.site_theme enable row level security;
alter table public.site_theme force row level security;
alter table public.site_hero enable row level security;
alter table public.site_hero force row level security;

revoke all on table public.site_theme, public.site_hero from public, anon, authenticated;
grant select, insert, update on table public.site_theme, public.site_hero to authenticated;

-- Policies for site_theme
create policy site_theme_select_member on public.site_theme
  for select to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_theme.site_id
        and public.current_user_tenant_role(s.tenant_id) is not null
    )
  );

create policy site_theme_insert_editor on public.site_theme
  for insert to authenticated with check (
    exists (
      select 1 from public.sites s
      where s.id = site_theme.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

create policy site_theme_update_editor on public.site_theme
  for update to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_theme.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  ) with check (
    exists (
      select 1 from public.sites s
      where s.id = site_theme.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

-- Policies for site_hero
create policy site_hero_select_member on public.site_hero
  for select to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_hero.site_id
        and public.current_user_tenant_role(s.tenant_id) is not null
    )
  );

create policy site_hero_insert_editor on public.site_hero
  for insert to authenticated with check (
    exists (
      select 1 from public.sites s
      where s.id = site_hero.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

create policy site_hero_update_editor on public.site_hero
  for update to authenticated using (
    exists (
      select 1 from public.sites s
      where s.id = site_hero.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  ) with check (
    exists (
      select 1 from public.sites s
      where s.id = site_hero.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );

commit;
