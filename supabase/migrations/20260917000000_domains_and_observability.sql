-- Phase 6: Domains and Observability Migration
-- Table: public.site_domains
-- Manages subdomains and custom domains with verification challenges and SSL tracking.

create table if not exists public.site_domains (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  domain text not null,
  status text not null default 'pending' check (status in ('pending', 'verified', 'failed')),
  verification_type text not null default 'cname' check (verification_type in ('cname', 'txt')),
  verification_token text not null,
  verified_at timestamptz,
  last_checked_at timestamptz,
  ssl_status text not null default 'pending' check (ssl_status in ('pending', 'active', 'error')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint site_domains_domain_unique unique (domain),
  constraint site_domains_domain_lowercase check (domain = lower(domain))
);

create index if not exists idx_site_domains_lookup
  on public.site_domains(domain, status);

create index if not exists idx_site_domains_site
  on public.site_domains(site_id, tenant_id);

alter table public.site_domains enable row level security;

-- Public can read verified domains for public routing resolution
create policy "Public can read verified domains"
  on public.site_domains
  for select
  to anon, authenticated
  using (
    status = 'verified'
  );

-- Tenant members can view all domains of their tenant sites
create policy "Tenant members can view their site domains"
  on public.site_domains
  for select
  to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = site_domains.tenant_id
        and tm.user_id = auth.uid()
    )
  );

-- Tenant editors, admins, and owners can insert domains
create policy "Tenant editors can insert site domains"
  on public.site_domains
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = site_domains.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'editor')
    )
  );

-- Tenant editors, admins, and owners can update their site domains
create policy "Tenant editors can update site domains"
  on public.site_domains
  for update
  to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = site_domains.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'editor')
    )
  )
  with check (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = site_domains.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'editor')
    )
  );

-- Tenant editors, admins, and owners can delete site domains
create policy "Tenant editors can delete site domains"
  on public.site_domains
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.tenant_members tm
      where tm.tenant_id = site_domains.tenant_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner', 'admin', 'editor')
    )
  );
