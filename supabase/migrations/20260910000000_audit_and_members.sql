begin;

-- Helper function to inspect the current user's role in a tenant without recursive RLS
create or replace function public.current_user_tenant_role(lookup_tenant_id uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.tenant_members
  where tenant_id = lookup_tenant_id and user_id = (select auth.uid())
  limit 1;
$$;

-- Table for immutable tenant audit logs
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  action text not null check (char_length(btrim(action)) between 1 and 64),
  resource_type text not null check (char_length(btrim(resource_type)) between 1 and 64),
  resource_id text not null check (char_length(btrim(resource_id)) between 1 and 128),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index audit_log_tenant_created_idx on public.audit_log (tenant_id, created_at desc);

alter table public.audit_log enable row level security;
alter table public.audit_log force row level security;

revoke all on table public.audit_log from public, anon, authenticated;
grant select, insert on table public.audit_log to authenticated;

-- Only owners and admins can view the tenant audit log
create policy audit_log_select_admin on public.audit_log
  for select to authenticated using (
    public.current_user_tenant_role(tenant_id) in ('owner', 'admin')
  );

-- Authenticated actors can only insert audit logs for tenants they belong to and matching their own uid
create policy audit_log_insert_actor on public.audit_log
  for insert to authenticated with check (
    actor_user_id = (select auth.uid()) and
    public.current_user_tenant_role(tenant_id) is not null
  );

-- Update tenant_members policies to allow tenant members to view other members of their tenant
drop policy if exists tenant_members_select_self on public.tenant_members;

create policy tenant_members_select_tenant on public.tenant_members
  for select to authenticated using (
    public.current_user_tenant_role(tenant_id) is not null
  );

-- Grant DML privileges for tenant_members to authenticated users (governed by RLS)
grant insert, update, delete on table public.tenant_members to authenticated;

-- RLS: Owners and admins can insert new members (only owners can assign owner role)
create policy tenant_members_insert_admin on public.tenant_members
  for insert to authenticated with check (
    (
      public.current_user_tenant_role(tenant_id) = 'owner'
      or (
        public.current_user_tenant_role(tenant_id) = 'admin'
        and role in ('admin', 'editor', 'viewer')
      )
    )
  );

-- RLS: Owners and admins can update member roles
create policy tenant_members_update_admin on public.tenant_members
  for update to authenticated using (
    public.current_user_tenant_role(tenant_id) = 'owner'
    or (
      public.current_user_tenant_role(tenant_id) = 'admin'
      and role in ('admin', 'editor', 'viewer')
    )
  ) with check (
    public.current_user_tenant_role(tenant_id) = 'owner'
    or (
      public.current_user_tenant_role(tenant_id) = 'admin'
      and role in ('admin', 'editor', 'viewer')
    )
  );

-- RLS: Owners and admins can remove members
create policy tenant_members_delete_admin on public.tenant_members
  for delete to authenticated using (
    public.current_user_tenant_role(tenant_id) = 'owner'
    or (
      public.current_user_tenant_role(tenant_id) = 'admin'
      and role in ('admin', 'editor', 'viewer')
    )
  );

commit;
