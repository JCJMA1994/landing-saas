-- Migration: 20260914000000_site_template_key.sql
-- Add template_key to public.sites with allowed template keys constraint

alter table public.sites
add column if not exists template_key text not null default 'tech-diagnostic'
check (template_key in (
  'tech-diagnostic',
  'repair-workshop',
  'system-monitor',
  'tech-editorial',
  'cyber-performance',
  'friendly-tech'
));

comment on column public.sites.template_key is 'The active visual direction/template for the site';
