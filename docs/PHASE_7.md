# Phase 7 — SEO and Analytics

## Overview
Phase 7 introduces enterprise-grade, multi-tenant SEO capabilities and privacy-first, cookieless telemetry to the SaaS Landing Page Platform. It empowers tenants to maximize organic search discoverability and track visitor conversions (page views, WhatsApp outbound clicks, and CTA interactions) without violating privacy regulations (GDPR/ePrivacy/CCPA) or compromising performance.

---

## Architecture & Principles

### 1. Zero-PII, Cookieless Analytics
- **No Third-Party Trackers or Third-Party Cookies**: No Google Analytics or Facebook Pixel scripts injected into tenant landing pages.
- **Daily Salted User Hashing**: Visitor identity is represented by a deterministic SHA-256 hash computed from `IP + User-Agent + Daily Salt`. The salt changes at 00:00 UTC, preventing cross-day user tracking and long-term profiling while preserving daily unique visitor counts.
- **Non-blocking Telemetry (`navigator.sendBeacon`)**: Events are queued and transmitted via browser `sendBeacon` or `fetch({ keepalive: true })`, ensuring page unloads or outbound links are tracked without delaying navigation.
- **Strict Tenant & Site Validation**: Telemetry events are tied to validated `site_id`s. RLS allows public insertions exclusively for legitimate published sites, while restricting analytical reads to authenticated tenant members.

### 2. Contextual & Multi-Tenant SEO
- **Dynamic Multi-Tenant Sitemaps (`/sitemap.xml`)**:
  - On platform host: lists all active, publicly published tenant sites.
  - On tenant custom domains or subdomains: generates an isolated, single-root sitemap referencing only that tenant's URLs and published timestamps (`lastmod`).
- **Dynamic Robots Exclusion (`/robots.txt`)**:
  - Automatically points crawlers to the host's sitemap.
  - Explicitly disallows administrative and internal routes (`/admin/`, `/api/`, `/preview/`).
- **Automatic Canonicalization**:
  - Canonical URLs dynamically honor custom domains (`https://taller-el-rayo.pe/`) or platform paths (`https://landingsaas.com/sites/taller-el-rayo`).
  - Drafts and previews automatically emit `<meta name="robots" content="noindex, nofollow" />`.
- **Word-Boundary Meta Truncation**:
  - Descriptions are truncated cleanly at 160 characters without cutting words in half, appending standard ellipses (`...`).
- **Context-Aware Schema.org JSON-LD**:
  - Graph builder outputs semantic Schema.org types matching the active template (`AutoRepair` for `repair-workshop`, `ProfessionalService` for `tech-diagnostic`, `LocalBusiness` for others).
  - Embeds catalog offers (`OfferCatalog`) derived directly from the site's card features.

---

## Database Schema & Security (`20260918000000_seo_and_analytics.sql`)

### Table `public.site_analytics_events`
```sql
CREATE TABLE IF NOT EXISTS public.site_analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID NOT NULL REFERENCES public.sites(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_name VARCHAR(64) NOT NULL,
  path VARCHAR(512) NOT NULL DEFAULT '/',
  referrer VARCHAR(1024),
  visitor_hash VARCHAR(64),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX idx_analytics_site_created ON public.site_analytics_events (site_id, created_at DESC);
CREATE INDEX idx_analytics_tenant_created ON public.site_analytics_events (tenant_id, created_at DESC);
```

### Row Level Security (RLS)
- **Insert Policy**: Public (`anon`, `authenticated`) can insert events if and only if `site_id` belongs to an active publication snapshot in `site_publications`.
- **Select Policy**: Authenticated tenant members can select events only for sites belonging to their authorized tenant (`is_tenant_member(tenant_id)`).
- **Update/Delete Policy**: Direct modifications or deletions are disallowed. Events are append-only.

---

## Domain & Application Modules

### 1. `src/domain/seo/metadata.ts`
- `truncateCleanly(text, maxLength)`: Safe word-boundary string truncation.
- `generateSeoMetadata(input)`: Composes Open Graph, Twitter Cards, theme colors, and canonical directives.

### 2. `src/domain/seo/schema-org.ts`
- `generateSchemaOrgJsonLd(snapshot, canonicalUrl, imageUrl)`: Constructs a JSON-LD `@graph` containing `LocalBusiness`/`AutoRepair` and `WebSite` nodes with telephone, email, and service offer catalogs.

### 3. `src/domain/analytics/event.ts`
- `generateVisitorHash(ip, userAgent, date)`: Computes pseudonymous SHA-256 daily hash.
- `validateAnalyticsEvent(input)`: Validates event payloads and sanitizes path / metadata.

### 4. `src/application/analytics/track-event.ts`
- `trackAnalyticsEventUseCase`: Persists verified events with user-agent pseudonymization.
- `getSiteAnalyticsSummaryUseCase`: Aggregates total views, unique visitors, WhatsApp clicks, CTA interactions, and conversion rate.

### 5. `src/infrastructure/supabase/analytics-repository.ts`
- Implements `AnalyticsRepository` interfacing with Supabase via parameter-isolated queries.

---

## UI Components & Endpoints

### 1. `src/components/seo/SeoHead.astro`
Consolidated `<head>` injector supporting:
- Title, description, canonical link, and robots metadata.
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:url`, `og:site_name`, `og:locale`).
- Twitter Card tags (`twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`).
- Inline Schema.org JSON-LD graph.
- Non-blocking client telemetry tracker with Do Not Track (DNT) detection and consent evaluation.

### 2. `src/components/seo/ConsentBanner.astro`
- Accessible, non-intrusive bottom banner allowing visitors to accept or decline anonymous analytics.
- Stores preference in `localStorage` without generating cookies.

### 3. `src/pages/sitemap.xml.ts` & `src/pages/robots.txt.ts`
- Host-aware sitemap and crawler rule generators.

### 4. `src/pages/api/events.ts`
- High-throughput ingestion endpoint supporting JSON payloads from `sendBeacon` and `fetch`.

### 5. `src/pages/admin/sites/[id]/analytics.astro`
- Comprehensive admin analytics dashboard providing:
  - KPI Cards: Total Page Views, Unique Visitors, WhatsApp Inquiries, CTA Interactions, and Overall Conversion Rate.
  - Recent Events Log with timestamp, event type badge, path, and metadata details.

---

## Verification & Metrics

- **Unit & Integration Tests**: 181 tests passing across 36 test files.
- **Astro Diagnostic Check**: `0 errors, 0 warnings, 0 hints` across 144 files.
- **Astro SSR Build**: 100% clean production bundle compilation.
