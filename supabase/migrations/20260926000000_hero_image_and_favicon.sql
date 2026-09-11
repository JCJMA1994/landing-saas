-- Migration: 20260926000000_hero_image_and_favicon.sql
-- Purpose: Add image_url to site_hero, favicon_url to site_theme, and link uploaded assets to active publication.

begin;

-- 1. Add image_url to site_hero if not exists
alter table public.site_hero
  add column if not exists image_url text check (
    image_url is null or (char_length(btrim(image_url)) between 1 and 512 and image_url ~ '^(https?://|/).*')
  );

-- 2. Add favicon_url to site_theme if not exists
alter table public.site_theme
  add column if not exists favicon_url text check (
    favicon_url is null or (char_length(btrim(favicon_url)) between 1 and 512 and favicon_url ~ '^(https?://|/).*')
  );

-- 3. Connect existing uploaded image for innovaciones-moreno
do $$
declare
  v_site_id uuid;
  v_file_path text;
  v_public_url text;
begin
  select id into v_site_id
  from public.sites
  where slug = 'innovaciones-moreno'
  limit 1;

  if v_site_id is not null then
    select file_path into v_file_path
    from public.media_assets
    where site_id = v_site_id
    order by created_at desc
    limit 1;

    if v_file_path is not null then
      v_public_url := 'https://ceyqdipflumrvjemelvr.supabase.co/storage/v1/object/public/site-assets/' || v_file_path;

      update public.site_hero
      set image_url = v_public_url, updated_at = now()
      where site_id = v_site_id;

      update public.site_theme
      set favicon_url = v_public_url, updated_at = now()
      where site_id = v_site_id;

      update public.site_publications
      set snapshot = jsonb_set(
        jsonb_set(snapshot, '{hero,imageUrl}', to_jsonb(v_public_url)),
        '{theme,faviconUrl}', to_jsonb(v_public_url)
      )
      where site_id = v_site_id and is_active = true;
    end if;
  end if;
end $$;

commit;
