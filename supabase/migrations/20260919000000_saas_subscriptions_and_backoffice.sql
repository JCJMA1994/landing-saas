begin;

-- Table for platform superadmins (backoffice authorization)
create table if not exists public.platform_superadmins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_superadmins enable row level security;
alter table public.platform_superadmins force row level security;

revoke all on table public.platform_superadmins from public, anon, authenticated;
grant select on table public.platform_superadmins to authenticated;

-- Helper to safely check if the current user is a platform superadmin
create or replace function public.is_platform_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.platform_superadmins
    where user_id = (select auth.uid())
  );
$$;

create policy superadmins_self_select on public.platform_superadmins
  for select to authenticated using (
    user_id = (select auth.uid()) or public.is_platform_superadmin()
  );

-- Table for tenant SaaS subscriptions and quotas
create table if not exists public.tenant_subscriptions (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade unique,
  plan_id text not null check (plan_id in ('starter', 'pro', 'agency')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  trial_ends_at timestamptz,
  current_period_starts_at timestamptz not null default now(),
  current_period_ends_at timestamptz not null default (now() + interval '30 days'),
  cancel_at_period_end boolean not null default false,
  billing_customer_id text check (billing_customer_id is null or char_length(btrim(billing_customer_id)) between 1 and 128),
  billing_subscription_id text check (billing_subscription_id is null or char_length(btrim(billing_subscription_id)) between 1 and 128),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_tenant_subscriptions_tenant_id on public.tenant_subscriptions (tenant_id);
create index if not exists idx_tenant_subscriptions_plan_status on public.tenant_subscriptions (plan_id, status);

alter table public.tenant_subscriptions enable row level security;
alter table public.tenant_subscriptions force row level security;

revoke all on table public.tenant_subscriptions from public, anon, authenticated;
grant select, insert, update on table public.tenant_subscriptions to authenticated;

-- Tenant members can view their subscription; superadmins can view all subscriptions
create policy tenant_subscriptions_select on public.tenant_subscriptions
  for select to authenticated using (
    public.current_user_tenant_role(tenant_id) is not null
    or public.is_platform_superadmin()
  );

-- Tenant owners can self-service update their subscription plan, or superadmins can override
create policy tenant_subscriptions_update on public.tenant_subscriptions
  for update to authenticated using (
    public.current_user_tenant_role(tenant_id) = 'owner'
    or public.is_platform_superadmin()
  ) with check (
    public.current_user_tenant_role(tenant_id) = 'owner'
    or public.is_platform_superadmin()
  );

-- Initial subscription insertion is permitted for tenant owners or superadmins
create policy tenant_subscriptions_insert on public.tenant_subscriptions
  for insert to authenticated with check (
    public.current_user_tenant_role(tenant_id) = 'owner'
    or public.is_platform_superadmin()
  );

commit;
