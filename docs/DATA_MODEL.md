# Modelo de datos

## Core
`tenants`, `profiles`, `tenant_members`, `sites`, `site_domains`.

## Theme
`site_theme(site_id, primary_color, secondary_color, accent_color, background_color, text_color, font_key, radius_key, button_variant, card_variant)`

## Content
`site_hero`, `site_cards`, `site_promotions`, `media_assets`.

## Campaigns
```text
campaigns
- id uuid pk
- site_id uuid fk
- name text
- campaign_type text
- status text            -- draft|scheduled|active|paused|archived
- intensity text         -- subtle|balanced|festive
- starts_at timestamptz
- ends_at timestamptz
- priority integer
- theme_override jsonb
- hero_override jsonb
- announcement_override jsonb
- promotion_override jsonb
- decoration_config jsonb
- created_by uuid
- created_at
- updated_at
```

### Restricciones
- `ends_at > starts_at`
- prioridad >= 0
- un campaign pertenece a un site
- JSONB solo para overrides versionables, no para ownership ni relaciones principales

## Publicación
`site_publications(id, site_id, version, snapshot jsonb, published_by, published_at, checksum)`

El snapshot incluye `template_key`, `template_version`, brand theme, content y campaign registry/config necesaria para render estable.

## Auditoría
`audit_log(tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at)`

## Índices
- `sites(tenant_id)`
- `site_domains(hostname)` unique
- `tenant_members(user_id, tenant_id)`
- `campaigns(site_id, status, starts_at, ends_at, priority desc)`
- `site_publications(site_id, version desc)`
