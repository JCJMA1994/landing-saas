begin;

-- Add logo_url to site_theme
alter table public.site_theme
  add column if not exists logo_url text;

-- Also update active publication snapshot to remove any hero image acting as favicon
update public.site_publications
set snapshot = jsonb_set(
  snapshot,
  '{theme,logoUrl}',
  'null'::jsonb,
  true
)
where snapshot->'theme' is not null;

commit;
