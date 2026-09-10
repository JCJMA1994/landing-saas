-- Reference migration sketch; adapt to project migration conventions.
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  site_id uuid not null references public.sites(id) on delete cascade,
  name text not null,
  campaign_type text not null,
  status text not null check (status in ('draft','scheduled','active','paused','archived')),
  intensity text not null default 'balanced' check (intensity in ('subtle','balanced','festive')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  priority integer not null default 0 check (priority >= 0),
  theme_override jsonb not null default '{}'::jsonb,
  hero_override jsonb not null default '{}'::jsonb,
  announcement_override jsonb not null default '{}'::jsonb,
  promotion_override jsonb not null default '{}'::jsonb,
  decoration_config jsonb not null default '{}'::jsonb,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);
create index if not exists idx_campaigns_active_window on public.campaigns(site_id,status,starts_at,ends_at,priority desc);
