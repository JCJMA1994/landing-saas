# Phase 9 — Scale Architecture (Cache, CDN Invalidation, Jobs, Webhooks & Image Transformations)

## Overview
Phase 9 equips the SaaS Landing Page Platform with enterprise-scale production infrastructure. It introduces hierarchical edge caching with Surrogate-Keys and stale-while-revalidate, instant CDN cache invalidation upon publication, asynchronous background job queuing with exponential backoff retries, cryptographically signed HMAC-SHA256 webhooks with delivery receipts, inbound billing webhook handling, and dynamic edge image transformations with modern format negotiation.

---

## Architecture & Principles

### 1. Edge Caching & Isolation
- **Public Landing Pages**:
  - `Cache-Control`: `public, max-age=60, s-maxage=3600, stale-while-revalidate=86400`
  - `ETag`: `W/"<snapshot-checksum>"`
  - `Surrogate-Key`: `site-<siteId> tenant-<tenantId>`
  - `Surrogate-Control`: `max-age=3600, stale-while-revalidate=86400`
  - `Vary`: `Accept, Accept-Encoding, Host`
- **Static & Transformed Assets**:
  - `Cache-Control`: `public, max-age=31536000, immutable`
- **Admin & Backoffice Endpoints**:
  - `Cache-Control`: `private, no-cache, no-store, must-revalidate` (strict isolation preventing multi-tenant cache leaks).

### 2. CDN Invalidation (`CdnInvalidationGateway`)
- When a landing page snapshot is published (`publishSiteUseCase`) or rolled back (`rollbackSiteUseCase`), the platform immediately dispatches an invalidation call to purge cache tags (`site-<id>`, `tenant-<id>`) and specific URL paths (`/sites/<slug>`, `/`).

### 3. Background Jobs with Exponential Backoff
- Table `public.background_jobs` persists tasks that require asynchronous processing.
- Calculation formula: `min(maxDelay, baseDelay * 2^(attempt - 1))`.
- Jobs that fail after `max_attempts` (default 3) are permanently marked as `failed` with error logs for administrative alerting.

### 4. Cryptographic Outbound & Inbound Webhooks
- **Outbound Webhooks**:
  - Generated with HMAC-SHA256 signature using the endpoint's secret.
  - Header: `X-SaaS-Signature: t=<timestamp>,v1=<hex-signature>`.
  - Replay protection: timestamps older or newer than 300 seconds are rejected.
  - Full delivery receipts (HTTP status code, truncated response body, attempt count) logged to `public.webhook_deliveries`.
- **Inbound Billing Webhook**:
  - Endpoint `/api/webhooks/billing` verifies incoming payment gateway signatures before updating `tenant_subscriptions` status (`active`, `past_due`).

### 5. Edge Image Transformations
- Endpoint: `/api/images/transform`
- Accepts parameters: `url`, `w` (16–3840), `h` (16–2160), `q` (10–100), `fit` (`cover`, `contain`, `inside`), `format` (`auto`, `webp`, `avif`, `png`, `jpeg`).
- Automatically negotiates modern image formats based on the browser's `Accept` header:
  - If `Accept` includes `image/avif` -> serves AVIF.
  - Else if `Accept` includes `image/webp` -> serves WebP.
  - Default fallback -> JPEG.
- Emits long-term immutable caching (`max-age=31536000, immutable`).

---

## Database Schema (`20260920000000_scale_jobs_webhooks_cdn.sql`)

### Table `public.background_jobs`
```sql
CREATE TABLE public.background_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  attempts INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  scheduled_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table `public.webhook_endpoints`
```sql
CREATE TABLE public.webhook_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  url TEXT NOT NULL CHECK (url ~* '^https?://'),
  secret TEXT NOT NULL CHECK (char_length(secret) >= 16),
  subscribed_events TEXT[] NOT NULL DEFAULT '{}',
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table `public.webhook_deliveries`
```sql
CREATE TABLE public.webhook_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id UUID NOT NULL REFERENCES public.webhook_endpoints(id) ON DELETE CASCADE,
  event_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('delivered', 'failed')),
  status_code INT,
  response_body TEXT,
  attempt INT NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Verification & Metrics
- **Vitest Unit & Integration Tests**: 45 test files, 219 tests passing (0 failures).
- **Astro Diagnostic Check**: `0 errors, 0 warnings, 0 hints` across 178 files.
- **Astro Production Build**: Compiled in 1.43s via `@astrojs/node` SSR.
