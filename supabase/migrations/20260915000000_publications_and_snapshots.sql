-- Migration: 20260915000000_publications_and_snapshots.sql
-- Table: public.site_publications
-- Purpose: Immutable published snapshots for public rendering, version history and rollbacks.

create table if not exists public.site_publications (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  checksum text not null,
  published_by uuid not null references auth.users(id),
  published_at timestamptz not null default now(),
  is_active boolean not null default false,
  constraint uq_site_publications_site_version unique (site_id, version)
);

-- Ensure only one active publication per site at a time
create unique index if not exists idx_site_publications_active
  on public.site_publications (site_id)
  where (is_active = true);

-- Fast lookup for publication history by site
create index if not exists idx_site_publications_site_version
  on public.site_publications (site_id, version desc);

-- Enable RLS
alter table public.site_publications enable row level security;
alter table public.site_publications force row level security;

-- Revoke DELETE privilege to guarantee immutable publication history
revoke delete on public.site_publications from authenticated, anon;

-- Policy: Select publications
-- Public/anon can view active publications for live site rendering.
-- Authenticated tenant members can view all publication history for their sites.
create policy "select_site_publications"
  on public.site_publications
  for select
  using (
    is_active = true
    or exists (
      select 1
      from public.sites s
      join public.tenant_members tm on tm.tenant_id = s.tenant_id
      where s.id = site_publications.site_id
        and tm.user_id = auth.uid()
    )
  );

-- Policy: Insert new publication
-- Only owner, admin, or editor of the site's tenant can publish.
create policy "insert_site_publications"
  on public.site_publications
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.sites s
      where s.id = site_publications.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
    and published_by = auth.uid()
  );

-- Policy: Update publications (used for toggling is_active on activation/rollback)
create policy "update_site_publications"
  on public.site_publications
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.sites s
      where s.id = site_publications.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1
      from public.sites s
      where s.id = site_publications.site_id
        and public.current_user_tenant_role(s.tenant_id) in ('owner', 'admin', 'editor')
    )
  );
