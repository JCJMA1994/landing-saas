-- Migration: 20260928000000_sites_update_policy.sql
-- Allow authenticated tenant members with editor+ roles to update site properties (e.g. template_key)

begin;

grant update on table public.sites to authenticated;

drop policy if exists sites_update_editor on public.sites;

create policy sites_update_editor on public.sites
  for update to authenticated
  using (
    public.current_user_tenant_role(tenant_id) in ('owner', 'admin', 'editor')
  )
  with check (
    public.current_user_tenant_role(tenant_id) in ('owner', 'admin', 'editor')
  );

commit;
