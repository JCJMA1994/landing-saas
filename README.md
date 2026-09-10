# Astro Landing SaaS Blueprint v2

## Estado de implementación

La fase 0 incorpora la base Astro SSR, configuración de entorno, tests,
migración inicial con RLS y CI. No incluye todavía administración,
publicación de landings ni despliegue. Ver [fase 0](docs/PHASE_0.md).

Blueprint técnico para una plataforma multi-tenant de landings administrables con Astro + Supabase. Esta versión añade un **Campaign / Seasonal Theme Engine** y un sistema de **direcciones visuales** para evitar plantillas genéricas.

## Objetivo

Cada cliente puede administrar contenido, identidad visual, assets, SEO y campañas temporales sin tocar código. La plataforma mantiene una sola base de código, aislamiento por tenant y publicación controlada.

## Stack
- Astro SSR / on-demand rendering
- React solo para islas interactivas del admin
- TypeScript strict
- Supabase Auth + PostgreSQL + Storage
- RLS para aislamiento multi-tenant
- Astro Actions para mutaciones
- Middleware para sesión + resolución de dominio/tenant
- Vitest + Playwright + tests SQL/RLS

## Capas de diseño
```text
Design System -> Template Direction -> Brand Theme -> Campaign Theme -> Section Override -> Render
```

## Principio clave
Una campaña estacional **no sustituye la marca**. Introduce overrides temporales controlados: accent, hero, announcement bar, promoción, decoración y CTA.

## Orden de lectura
1. `docs/ARCHITECTURE.md`
2. `docs/TEMPLATE_DESIGN_SYSTEM.md`
3. `docs/CAMPAIGN_ENGINE.md`
4. `docs/DATA_MODEL.md`
5. `docs/SECURITY.md`
6. `rules/00-global.md`
7. skill específico de la tarea
