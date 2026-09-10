-- Phase 4: Campaign Engine Migration
-- Table: public.site_campaigns
-- Enforces seasonal and promotional campaigns without landing duplication.

create table if not exists public.site_campaigns (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  preset text not null check (preset in ('fiestas-patrias', 'navidad', 'ano-nuevo', 'custom')),
  intensity text not null check (intensity in ('subtle', 'balanced', 'festive')),
  status text not null check (status in ('draft', 'scheduled', 'active', 'archived')),
  priority integer not null default 0,
  timezone text not null default 'UTC',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  banner_text text,
  banner_link text,
  badge_text text,
  accent_color text,
  show_countdown boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_campaigns_date_range check (ends_at > starts_at)
);

create index if not exists idx_site_campaigns_resolution 
  on public.site_campaigns(site_id, status, priority desc, starts_at, ends_at);

alter table public.site_campaigns enable row level security;

-- Public can view active or scheduled campaigns for published sites
create policy "Public can read active campaigns for published sites"
  on public.site_campaigns
  for select
  to anon, authenticated
  using (
    status in ('active', 'scheduled')
  );

-- Tenant members can view all campaigns of their sites
create policy "Tenant members can view all site campaigns"
  on public.site_campaigns
  for select
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      inner join public.tenant_members tm on tm.tenant_id = s.tenant_id
      where s.id = site_campaigns.site_id
        and tm.user_id = auth.uid()
    )
  );

-- Tenant editors, admins, and owners can insert campaigns
create policy "Tenant editors can insert site campaigns"
  on public.site_campaigns
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.sites s
      inner join public.tenant_members tm on tm.tenant_id = s.tenant_id
      where s.id = site_campaigns.site_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'editor')
    )
  );

-- Tenant editors, admins, and owners can update campaigns
create policy "Tenant editors can update site campaigns"
  on public.site_campaigns
  for update
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      inner join public.tenant_members tm on tm.tenant_id = s.tenant_id
      where s.id = site_campaigns.site_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.sites s
      inner join public.tenant_members tm on tm.tenant_id = s.tenant_id
      where s.id = site_campaigns.site_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'editor')
    )
  );

-- Tenant editors, admins, and owners can delete campaigns
create policy "Tenant editors can delete site campaigns"
  on public.site_campaigns
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.sites s
      inner join public.tenant_members tm on tm.tenant_id = s.tenant_id
      where s.id = site_campaigns.site_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'editor')
    )
  );
