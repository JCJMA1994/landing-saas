-- Phase 7: SEO and Analytics Migration
-- Table: public.site_analytics_events
-- Stores privacy-first, cookieless telemetry and conversion events.

create table if not exists public.site_analytics_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  event_name text not null check (
    event_name in ('page_view', 'cta_click', 'whatsapp_click', 'contact_submit', 'campaign_view')
  ),
  path text not null,
  referrer text,
  user_agent_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Fast aggregation indexes by site, event, and time
create index if not exists idx_site_analytics_summary
  on public.site_analytics_events(site_id, event_name, created_at desc);

create index if not exists idx_site_analytics_tenant
  on public.site_analytics_events(tenant_id, created_at desc);

alter table public.site_analytics_events enable row level security;

-- Public can insert telemetry events for valid sites without authentication (beacon endpoint)
create policy "Public can record site analytics events"
  on public.site_analytics_events
  for insert
  to anon, authenticated
  with check (
    exists (
      select 1 from public.sites s
      where s.id = site_analytics_events.site_id
        and s.tenant_id = site_analytics_events.tenant_id
    )
  );

-- Only authenticated tenant members can view analytics of their sites
create policy "Tenant members can view site analytics events"
  on public.site_analytics_events
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = site_analytics_events.tenant_id
        and tm.user_id = auth.uid()
    )
  );
