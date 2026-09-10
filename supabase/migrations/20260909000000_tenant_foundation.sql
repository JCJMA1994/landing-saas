begin;

create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now()
);

create table public.tenant_members (
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);

create index tenant_members_user_tenant_idx on public.tenant_members (user_id, tenant_id);

create table public.sites (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  slug text not null check (char_length(slug) between 1 and 63 and slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (char_length(btrim(name)) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (tenant_id, slug)
);

alter table public.tenants enable row level security;
alter table public.tenants force row level security;
alter table public.tenant_members enable row level security;
alter table public.tenant_members force row level security;
alter table public.sites enable row level security;
alter table public.sites force row level security;

revoke all on table public.tenants, public.tenant_members, public.sites from public, anon, authenticated;
grant usage on schema public to authenticated;
grant select on table public.tenants, public.tenant_members, public.sites to authenticated;

create policy tenant_members_select_self on public.tenant_members
  for select to authenticated using (user_id = (select auth.uid()));

create policy tenants_select_member on public.tenants
  for select to authenticated using (
    exists (select 1 from public.tenant_members membership
      where membership.tenant_id = tenants.id and membership.user_id = (select auth.uid()))
  );

create policy sites_select_member on public.sites
  for select to authenticated using (
    exists (select 1 from public.tenant_members membership
      where membership.tenant_id = sites.tenant_id and membership.user_id = (select auth.uid()))
  );

-- Phase zero intentionally has no runtime DML grants or write policies.
commit;
