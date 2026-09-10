begin;

-- Table for tracking site media assets and metadata
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  site_id uuid not null references public.sites(id) on delete cascade,
  file_path text not null unique,
  mime_type text not null check (mime_type in ('image/jpeg', 'image/png', 'image/webp')),
  file_size_bytes integer not null check (file_size_bytes between 1 and 5242880),
  alt_text text not null check (char_length(btrim(alt_text)) between 1 and 160),
  created_at timestamptz not null default now()
);

create index media_assets_site_idx on public.media_assets (site_id, created_at desc);
create index media_assets_tenant_idx on public.media_assets (tenant_id);

alter table public.media_assets enable row level security;
alter table public.media_assets force row level security;

revoke all on table public.media_assets from public, anon, authenticated;
grant select, insert, delete on table public.media_assets to authenticated;

-- Policies for media_assets
create policy media_assets_select_member on public.media_assets
  for select to authenticated using (
    public.current_user_tenant_role(tenant_id) is not null
  );

create policy media_assets_insert_editor on public.media_assets
  for insert to authenticated with check (
    public.current_user_tenant_role(tenant_id) in ('owner', 'admin', 'editor')
  );

create policy media_assets_delete_editor on public.media_assets
  for delete to authenticated using (
    public.current_user_tenant_role(tenant_id) in ('owner', 'admin', 'editor')
  );

-- Create storage bucket if storage schema exists
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'site-assets',
  'site-assets',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- Storage object policies for site-assets bucket
create policy site_assets_select_member on storage.objects
  for select to authenticated using (
    bucket_id = 'site-assets' and
    public.current_user_tenant_role((storage.foldername(name))[1]::uuid) is not null
  );

create policy site_assets_insert_editor on storage.objects
  for insert to authenticated with check (
    bucket_id = 'site-assets' and
    public.current_user_tenant_role((storage.foldername(name))[1]::uuid) in ('owner', 'admin', 'editor')
  );

create policy site_assets_delete_editor on storage.objects
  for delete to authenticated using (
    bucket_id = 'site-assets' and
    public.current_user_tenant_role((storage.foldername(name))[1]::uuid) in ('owner', 'admin', 'editor')
  );

commit;
