-- Migration: 20260925000000_analytics_telemetry_fix.sql
-- Fix: Grant anon permissions on site_analytics_events and allow tenant_id resolution on sites for telemetry beacons.

begin;

-- 1. Grant SELECT on sites (id, slug, tenant_id) to anon
grant select (id, slug, tenant_id) on table public.sites to anon;

-- 2. Grant INSERT on site_analytics_events to anon and authenticated
grant insert on table public.site_analytics_events to anon, authenticated;

-- 3. Ensure RLS policy permits anonymous telemetry insertions
drop policy if exists "Public can record site analytics events" on public.site_analytics_events;
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

commit;
