# Roadmap

## Fase 0 - Fundaciones
Astro, Supabase, strict TS, CI, environments, migraciones, tenant strategy, ADRs.

Estado: base implementada; cierre pendiente de typecheck, build, smoke de
runtime, replay de migraciones, tests RLS y una ejecución real de CI.

## Fase 1 - MVP administrable
Auth, sites, members, theme, hero, cards, promociones, WhatsApp, redes, Storage y RLS.

Estado: Completada. Se implementaron y verificaron los 5 cortes verticales:
1. Autenticación y sitios accesibles (Login/logout local, middleware guard, aislamiento RLS).
2. Membresías auditadas y permisos (RBAC con protección de último owner, `public.audit_log` inmutable).
3. Site theme y Hero en modo borrador (Validación hex/tipografía/radii, previews en vivo).
4. Feature cards, promociones y canales de contacto (WhatsApp E.164 con enlace directo, redes, secuencias de fechas).
5. Storage y gestión de assets multimedia (Bucket `site-assets` con RLS, límites de tamaño, allowlist MIME y auditoría).
Suite completa de 100 tests unitarios y de integración, 0 errores en `astro check` y build SSR verificado.

## Fase 2 — Design System y direcciones visuales
Design tokens, presets, componentes responsive y templates con identidad real: `tech-diagnostic`, `repair-workshop`, `system-monitor`, `tech-editorial`, `cyber-performance`, `friendly-tech`.

Estado: Completada. Se implementaron:
1. Sistema de tokens semánticos en CSS (`tokens.css`, `tokens.ts`) con tipografía fluida, escalas de espaciado, radios, sombras y cálculo de contraste accesible WCAG AA.
2. Manifiestos versionados para los 6 templates en `manifest.ts` y sincronización con `template-registry.config.ts`.
3. Componentes atómicos semánticos y accesibles: `Button.astro`, `Badge.astro`, `Card.astro`, `Icon.astro`, `WhatsAppButton.astro`.
4. Los 6 templates con composición y ritmo auténticos:
   - `tech-diagnostic`: Telemetría HUD, chips de estado y matriz diagnóstica.
   - `repair-workshop`: Ficha de admisión, banco técnico y repuestos modulares.
   - `system-monitor`: Consola de observabilidad, terminal activo y monitoreo de nodos.
   - `tech-editorial`: Gran escala tipográfica, layout asimétrico y pull quotes.
   - `cyber-performance`: Cortes angulares, estética overclocking y energía neon.
   - `friendly-tech`: Curvas amigables, enfoque accesible y micro-copy humano.
5. Selector y previsualización en vivo en el panel de administración (`/admin/sites/[id]/template`) con acción auditada `saveSiteTemplate`.
Suite de 111 tests pasando, 0 errores en `astro check` y build SSR verificado.

## Fase 3 — Draft / Preview / Publish
Snapshots, historial, rollback y auditoría.

Estado: Completada. Se implementaron y verificaron los 5 slices:
1. Migración y RLS (`20260915000000_publications_and_snapshots.sql`): Tabla inmutable `site_publications` con `version`, `snapshot jsonb`, `checksum`, partial unique index de publicación activa, permisos revocados para `DELETE` y RLS multi-tenant estricto.
2. Motor de Snapshots y Checksums (`snapshot.ts`, `publication.ts`): Serialización canónica determinista de claves JSON, generación de hash criptográfico SHA-256 (Web Crypto API) y validación de esquema inmutable.
3. Capa de Aplicación y Repositorios (`manage-publication.ts`, `publication-repository.ts`): Casos de uso `publishSiteUseCase` y `rollbackSiteUseCase` con incremento secuencial atómico, desactivación segura de versiones previas, registro auditado (`site.published`, `site.rolled_back` con `rolledBackFromVersion`), y garantía ADR 0002 (un rollback crea una nueva versión $N+1$, jamás sobreescribe ni muta el pasado).
4. Astro Actions & Admin Dashboard (`/admin/sites/[id]/publish.astro`): Acciones form `publishSite` y `rollbackSite`, vista de sincronización en tiempo real (draft vs. active checksum), tabla completa de historial de versiones y actualización de tabs de navegación en todo el panel de administración.
5. Renderizado Público & Preview Aislado (`/preview/[id].astro`, `/sites/[slug].astro`, `/index.astro`): Previsualización protegida con banner contextual (borrador vs snapshot histórico), y renderizado de landing pública que lee estrictamente de la publicación activa sin tocar tablas de borrador.
Suite completa de 122 tests pasando en 22 suites, 0 errores/warnings en `astro check` y build SSR verificado.

## Fase 4 — Campaign Engine
Campañas programables, prioridad, intensity presets, overrides, scheduling y preview por fecha. Presets iniciales: Fiestas Patrias, Navidad, Año Nuevo, campaña personalizada.

Estado: Completada. Se implementaron y verificaron los 5 slices:
1. Migración y RLS (`20260916000000_campaign_engine.sql`): Tabla `public.site_campaigns` con restricción de rango de fechas (`ends_at > starts_at`), índice de resolución determinista y RLS multi-tenant estricto.
2. Dominio & Presets Estacionales (`campaign.ts`, `presets.ts`, `resolver.ts`): Presets oficiales (*Fiestas Patrias*, *Navidad*, *Año Nuevo*, *Custom*), niveles de intensidad (`subtle`, `balanced`, `festive`), y algoritmo de resolución determinista por ventana temporal UTC, estado y prioridad con desempates por fecha más reciente e ID.
3. Capa de Aplicación & Repositorios (`manage-campaigns.ts`, `campaign-repository.ts`): Casos de uso `saveCampaignUseCase`, `deleteCampaignUseCase` y `resolveSiteCampaignUseCase`, con auditoría inmutable en `public.audit_log` (`campaign.created`, `campaign.updated`, `campaign.deleted`).
4. Componentes Visuales & Integración (`CampaignBanner.astro`, `TemplateRenderer.astro`): Banner superior accesible con countdown progresivo (respetando `prefers-reduced-motion`), inyección de acentos semánticos y badges de Hero allowlisted sin duplicar ninguna landing.
5. Consola Admin & Time-Travel Preview (`/admin/sites/[id]/campaigns.astro`, `/preview/[id].astro`, `/sites/[slug].astro`): Consola de gestión con programación de fechas, acciones form protegidas `saveCampaign` y `deleteCampaign`, simulación temporal interactiva (`?simulateDate=...`) en Preview y resolución en vivo en la landing pública.
Suite completa de 136 tests pasando en 26 suites, 0 errores/warnings en `astro check` y build SSR verificado.

## Fase 5 — Multi-template
Registro versionado de templates y compatibilidad de secciones/campañas.

Estado: Completada. Se implementaron y verificaron los 5 slices:
1. Registro Versionado de Templates (`registry.ts`): Catálogo tipado con `RegisteredTemplate` (versión 1.0), dirección artística declarada, matriz de secciones soportadas y slots de campaña por template.
2. Motor de Compatibilidad y Degradación Segura (`compatibility.ts`): Evaluación sin pérdida de datos de compatibilidad entre templates, secciones, tokens de diseño y slots de campaña (degradando con advertencias informativas en templates minimalistas como `system-monitor` y `tech-editorial`).
3. Casos de Uso y Aplicación (`manage-template-registry.ts`): Casos de uso `evaluateTemplateSwitchUseCase` y `switchSiteTemplateUseCase` con autorización RBAC, aplicación opcional de variantes de diseño recomendadas (`applySuggestedVariants`), y registro auditado inmutable (`site_template.switched`).
4. UI de Administración y Feedback de Compatibilidad (`/admin/sites/[id]/template.astro`): Selector de templates con badges de versión (`v1.0`), slots soportados, advertencias preventivas de degradación de campañas activas y opción de sincronización de variantes de diseño.
5. Verificación Integral: Suite de 146 tests unitarios y de integración pasando en 28 suites, 0 errores/warnings en `astro check` y build SSR verificado.

## Fase 6 — Dominios y operación
Subdominios, custom domains, DNS verification, HTTPS, observabilidad.

Estado: Completada. Se implementaron y verificaron los 5 slices:
1. Migración y RLS (`20260917000000_domains_and_observability.sql`): Tabla inmutable `public.site_domains` con restricción de unicidad global contra hijacking, índices de lookup y políticas RLS multi-tenant estrictas.
2. Dominio y Enrutamiento Aislado (`host.ts`, `site-domain.ts`): Extensión de `HostRoutingContext` con variantes `platform`, `subdomain` y `custom_domain` (preservando el principio de que un host es un routing hint y jamás prueba de pertenencia de tenant), validación RFC 1035/1123 y cálculo de registros DNS de desafío.
3. Capa de Aplicación y Gateway DNS (`manage-domains.ts`, `dns-gateway.ts`, `domain-repository.ts`): Casos de uso `addSiteDomainUseCase`, `verifySiteDomainUseCase` y `deleteSiteDomainUseCase` con gateway DNS desacoplado, activación de SSL y auditoría inmutable en `public.audit_log`.
4. Observabilidad y Telemetría (`src/middleware.ts`, `/api/health`): Header `Server-Timing: total;dur=...`, correlación `X-Request-Id`, aislamiento de rutas `/admin` al host de plataforma y endpoint de salud `/api/health`.
5. UI de Administración y Enrutamiento Transparente (`/admin/sites/[id]/domains.astro`, `index.astro`): Consola de dominios con instrucciones CNAME/TXT interactivas, acciones form protegidas y renderizado directo en `/` para subdominios y dominios personalizados.
Suite completa de 168 tests pasando en 32 suites, 0 errores/warnings en `astro check` y build SSR verificado.

## Fase 7 — SEO y Analytics
Metadata, canonical, OG, sitemap, schema.org, eventos, consent.

Estado: Completada. Se implementaron y verificaron los 5 slices:
1. Migración y RLS (`20260918000000_seo_and_analytics.sql`): Tabla `public.site_analytics_events` con partición e índices de agregación temporal (`idx_analytics_site_created`), hashing de IP/User-Agent con salt rotativo diario (SHA-256 cookieless) y políticas RLS seguras (inserción pública validando sitios publicados, lectura restringida a miembros del tenant).
2. Dominio SEO & Schema.org (`metadata.ts`, `schema-org.ts`, `event.ts`): Generador determinista de metadata SEO, Open Graph y Twitter Cards con truncamiento inteligente en límites de palabra (160 caracteres), canonical URLs dinámicas respetando custom domains/subdominios, y grafo Schema.org JSON-LD tipado contextual (`AutoRepair`, `ProfessionalService`, `LocalBusiness` y `WebSite`).
3. Capa de Aplicación & Analytics Privacy-First (`track-event.ts`, `analytics-repository.ts`): Casos de uso `trackAnalyticsEventUseCase` y `getSiteAnalyticsSummaryUseCase` calculando vistas, conversiones de WhatsApp, clics en CTAs y tasa de conversión, con anonimización estricta sin almacenamiento de PII ni cookies persistentes.
4. Endpoints Dinámicos y Telemetría (`sitemap.xml.ts`, `robots.txt.ts`, `/api/events.ts`, `SeoHead.astro`, `ConsentBanner.astro`): `sitemap.xml` y `robots.txt` multi-tenant aislados por host (`platform`, `subdomain`, `custom_domain`), endpoint de telemetría de alta concurrencia no bloqueante con soporte para `navigator.sendBeacon`, componente unificado `SeoHead` y banner de consentimiento accesible.
5. Dashboard de Analytics en Administración (`/admin/sites/[id]/analytics.astro`): Panel de métricas con KPIs de tráfico, funnel de conversión, tabla de eventos recientes auditados y enlaces de navegación consistentes.
Suite completa de 181 tests pasando en 36 suites, 0 errores/warnings en `astro check` y build SSR verificado.

## Fase 8 — SaaS
Planes, quotas, suscripciones, trial, facturación, feature flags, backoffice.

Estado: Completada. Se implementaron y verificaron los 5 slices:
1. Migración y RLS (`20260919000000_saas_subscriptions_and_backoffice.sql`): Tablas `public.tenant_subscriptions` (con restricciones de planes, estados de suscripción, períodos y unicidad por tenant) y `public.platform_superadmins` con función `is_platform_superadmin()` y RLS multi-tenant estricto.
2. Capa de Dominio SaaS (`plan.ts`, `quota.ts`, `feature-flag.ts`, `subscription.ts`): Modelado tipado de planes (`starter`, `pro`, `agency`), límites jerárquicos de recursos (sitios, dominios, campañas, eventos, media assets), matriz de feature flags por plan (`customDomains`, `campaigns`, `advancedAnalytics`, `removeBranding`, `prioritySupport`), y ciclo de vida de suscripción con trial automático de 14 días.
3. Capa de Aplicación & Infraestructura (`manage-subscription.ts`, `subscription-repository.ts`, `mock-billing-gateway.ts`): Casos de uso de aprovisionamiento perezoso de suscripciones, cambio de plan con autorización de owner/superadmin y auditoría inmutable (`subscription.plan_changed`), verificación previa de quotas en el servidor (`enforceTenantQuotaUseCase`) y verificación de feature flags.
4. Enforcers en Actions & Consola de Billing (`/admin/billing.astro`, `actions.ts`): Bloqueo preventivo en servidor de `addDomain` y `saveCampaign` si el plan no tiene la feature flag o excede la quota, y consola self-service con medidores porcentuales de uso de recursos, estado de trial y selector de planes.
5. Backoffice de Superadministrador (`/backoffice/index.astro`): Consola global protegida para superadministradores con KPIs consolidados de plataforma (total de tenants, suscripciones activas, MRR estimado, desglose de inquilinos y selector de override de plan administrativo).
Suite completa de 201 tests pasando en 41 suites, 0 errores/warnings en `astro check` y build SSR verificado.

## Fase 9 — Escala
Cache, CDN invalidation, jobs, webhooks, image transformations, read replicas cuando exista necesidad real.

Estado: Completada. Se implementaron y verificaron los 5 slices:
1. Migración y RLS (`20260920000000_scale_jobs_webhooks_cdn.sql`): Tablas `public.background_jobs` (cola con retries, backoff y estados), `public.webhook_endpoints` (configuración de eventos y secretos) y `public.webhook_deliveries` (auditoría de entregas con respuestas HTTP y timestamps) con aislamiento RLS multi-tenant estricto.
2. Edge Caching & Purga de CDN (`cache.ts`, `cdn-gateway.ts`, `mock-cdn-gateway.ts`): Políticas HTTP avanzadas para landing pages (`s-maxage=3600, stale-while-revalidate=86400`, `ETag: W/"<checksum>"`, `Surrogate-Key: site-<id> tenant-<id>`), aislamiento estricto `private, no-store` para admin y backoffice, e invalidación instantánea de cache CDN en `publishSiteUseCase` y `rollbackSiteUseCase`.
3. Cola de Background Jobs (`job.ts`, `manage-jobs.ts`, `job-repository.ts`): Pipeline asíncrono con cálculo determinista de reintentos exponenciales (`exponential backoff`), ejecución atómica de tareas y mitigación de fallos permanentes tras agotar reintentos máximos.
4. Motor de Webhooks Criptográfico & Receptor de Billing (`webhook.ts`, `manage-webhooks.ts`, `/api/webhooks/billing.ts`): Firmado HMAC-SHA256 con cabeceras `X-SaaS-Signature: t=...,v1=...` y ventana de tolerancia anti-replay, despacho concurrente con registro de entregas, y endpoint receptor para eventos de facturación (`subscription.updated`, `invoice.payment_succeeded`, `invoice.payment_failed`).
5. Transformación y Optimización de Imágenes (`image-transform.ts`, `/api/images/transform.ts`): Negociación automática de formatos modernos (`image/avif`, `image/webp`) según cabecera `Accept`, control de dimensiones/calidad y cache inmutable a largo plazo (`max-age=31536000, immutable`).
Suite completa de 219 tests pasando en 45 suites, 0 errores/warnings en `astro check` y build SSR verificado.
