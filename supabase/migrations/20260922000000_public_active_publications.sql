-- Migration: 20260922000000_public_active_publications.sql
-- Fix: Allow public visitors (anon) to read active published landing content without RLS cross-table permission failures.

begin;

-- 1. Grant SELECT privilege to anon on site_publications and public slug lookup on sites
grant select on table public.site_publications to anon, authenticated;
grant select (id, slug) on table public.sites to anon;

-- 2. Drop existing monolithic policy that caused Postgres to check sites permissions for anon queries
drop policy if exists "select_site_publications" on public.site_publications;

-- 3. Policy for public/anon: can ONLY view active publications (no dependency on sites table)
create policy "select_active_site_publications"
  on public.site_publications
  for select
  using (is_active = true);

-- 4. Policy for authenticated tenant members: can view all history for their sites
create policy "select_tenant_site_publications"
  on public.site_publications
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.sites s
      join public.tenant_members tm on tm.tenant_id = s.tenant_id
      where s.id = site_publications.site_id
        and tm.user_id = auth.uid()
    )
  );

-- 5. Policy for anon on sites table: allow looking up site id by slug for public resolution
drop policy if exists "public_sites_lookup" on public.sites;
create policy "public_sites_lookup"
  on public.sites
  for select
  to anon
  using (true);

commit;
