begin;

-- Table for background jobs processing queue
create table if not exists public.background_jobs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid references public.tenants(id) on delete cascade,
  job_type text not null check (char_length(btrim(job_type)) between 1 and 64),
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts int not null default 0,
  max_attempts int not null default 3,
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_background_jobs_queue on public.background_jobs (status, scheduled_at) where status in ('pending', 'processing');
create index if not exists idx_background_jobs_tenant on public.background_jobs (tenant_id, created_at desc);

alter table public.background_jobs enable row level security;
alter table public.background_jobs force row level security;

revoke all on table public.background_jobs from public, anon, authenticated;
grant select, insert, update on table public.background_jobs to authenticated;

-- Tenant members can view their tenant's background jobs; superadmins can view all
create policy background_jobs_select on public.background_jobs
  for select to authenticated using (
    (tenant_id is not null and public.current_user_tenant_role(tenant_id) is not null)
    or public.is_platform_superadmin()
  );

-- Enqueueing jobs is allowed for tenant members or superadmins
create policy background_jobs_insert on public.background_jobs
  for insert to authenticated with check (
    (tenant_id is not null and public.current_user_tenant_role(tenant_id) is not null)
    or public.is_platform_superadmin()
  );

-- Table for tenant webhook endpoints (outbound event notifications)
create table if not exists public.webhook_endpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  url text not null check (url ~* '^https?://'),
  secret text not null check (char_length(secret) >= 16),
  subscribed_events text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_webhook_endpoints_tenant on public.webhook_endpoints (tenant_id);

alter table public.webhook_endpoints enable row level security;
alter table public.webhook_endpoints force row level security;

revoke all on table public.webhook_endpoints from public, anon, authenticated;
grant select, insert, update, delete on table public.webhook_endpoints to authenticated;

-- Tenant members can view endpoints
create policy webhook_endpoints_select on public.webhook_endpoints
  for select to authenticated using (
    public.current_user_tenant_role(tenant_id) is not null
    or public.is_platform_superadmin()
  );

-- Only owners and admins can configure webhooks
create policy webhook_endpoints_mutate on public.webhook_endpoints
  for all to authenticated using (
    public.current_user_tenant_role(tenant_id) in ('owner', 'admin')
    or public.is_platform_superadmin()
  ) with check (
    public.current_user_tenant_role(tenant_id) in ('owner', 'admin')
    or public.is_platform_superadmin()
  );

-- Table for webhook delivery receipts and auditing
create table if not exists public.webhook_deliveries (
  id uuid primary key default gen_random_uuid(),
  endpoint_id uuid not null references public.webhook_endpoints(id) on delete cascade,
  event_name text not null check (char_length(btrim(event_name)) between 1 and 64),
  payload jsonb not null,
  status text not null check (status in ('delivered', 'failed')),
  status_code int,
  response_body text,
  attempt int not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_webhook_deliveries_endpoint on public.webhook_deliveries (endpoint_id, created_at desc);

alter table public.webhook_deliveries enable row level security;
alter table public.webhook_deliveries force row level security;

revoke all on table public.webhook_deliveries from public, anon, authenticated;
grant select, insert on table public.webhook_deliveries to authenticated;

create policy webhook_deliveries_select on public.webhook_deliveries
  for select to authenticated using (
    exists (
      select 1 from public.webhook_endpoints we
      where we.id = webhook_deliveries.endpoint_id
      and (public.current_user_tenant_role(we.tenant_id) is not null or public.is_platform_superadmin())
    )
  );

commit;
