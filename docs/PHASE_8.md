# Phase 8 — SaaS Architecture (Plans, Quotas, Subscriptions, Trial, Feature Flags & Backoffice)

## Overview
Phase 8 implements multi-tenant SaaS monetization, plan tiering, resource quota enforcement, trial management, plan-based feature flags, self-service tenant billing, and platform-wide superadmin administration.

---

## Architecture & Principles

### 1. Zero Trust in Client-Supplied Identifiers
- **Server-Enforced Quotas**: Every mutation (`actions.addDomain`, `actions.saveCampaign`, site generation) checks plan allowances on the server before modifying state.
- **Tenant Isolation**: Subscription queries enforce tenant membership through RLS (`public.current_user_tenant_role(tenant_id)`). A tenant can never view or modify another tenant's subscription.
- **Immutable Audit Logging**: Every plan upgrade, downgrade, or superadmin override is recorded in `public.audit_log` with actor ID, timestamp, old plan, and new plan.

### 2. Plan Tiering Matrix

| Feature / Resource | Starter (Free) | Pro ($29/mo) | Agency ($99/mo) |
| :--- | :--- | :--- | :--- |
| **Max Published Sites** | 1 | 5 | 25 |
| **Custom Domains** | 0 | 3 | 20 |
| **Active Campaigns** | 1 | 5 | 50 |
| **Monthly Analytics Events**| 10,000 | 250,000 | 2,000,000 |
| **Max Media Assets** | 5 | 50 | 500 |
| **Custom Domains Allowed** | ✗ No | ✓ Yes | ✓ Yes |
| **Campaigns Allowed** | ✗ No | ✓ Yes | ✓ Yes |
| **Advanced Analytics** | ✗ Basic | ✓ Yes | ✓ Yes |
| **Remove Platform Branding** | ✗ No | ✓ Yes | ✓ Yes |
| **Priority 24/7 Support** | ✗ No | ✗ No | ✓ Yes |

### 3. Trial Lifecycle
- When a new tenant is provisioned or accesses billing for the first time without an explicit plan, the platform lazily assigns a **14-day trial of the Pro tier**.
- `calculateTrialDaysRemaining(subscription)` dynamically calculates days left until expiration.
- Once a trial expires, `isSubscriptionOperational` marks the account for payment collection while preserving existing published sites in read-only mode.

---

## Database Schema & Security (`20260919000000_saas_subscriptions_and_backoffice.sql`)

### Table `public.tenant_subscriptions`
```sql
CREATE TABLE public.tenant_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE UNIQUE,
  plan_id TEXT NOT NULL CHECK (plan_id IN ('starter', 'pro', 'agency')),
  status TEXT NOT NULL CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'incomplete')),
  trial_ends_at TIMESTAMPTZ,
  current_period_starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  current_period_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  billing_customer_id TEXT,
  billing_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Table `public.platform_superadmins`
```sql
CREATE TABLE public.platform_superadmins (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### Security Definer Helper
```sql
CREATE OR REPLACE FUNCTION public.is_platform_superadmin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.platform_superadmins
    WHERE user_id = (SELECT auth.uid())
  );
$$;
```

---

## Application Modules & Interfaces

### 1. Domain Entities (`src/domain/saas/`)
- `plan.ts`: Plan manifests, pricing, and limit definitions.
- `quota.ts`: `evaluateQuota(plan, resource, currentUsage)` and `assertQuotaNotExceeded(plan, resource, currentUsage)`.
- `feature-flag.ts`: `assertFeatureEnabled(plan, feature)` and `isFeatureEnabled(plan, feature)`.
- `subscription.ts`: Subscription lifecycle and `calculateTrialDaysRemaining(subscription)`.

### 2. Application Use Cases (`src/application/saas/manage-subscription.ts`)
- `getTenantSubscriptionUseCase(tenantId, repo)`: Resolves or auto-provisions trial subscription.
- `changeTenantPlanUseCase(input)`: Validates role permissions, saves plan change, and writes audit record.
- `enforceTenantQuotaUseCase(input)`: Inspects live database counts against plan limit before mutations.
- `checkTenantFeatureFlagUseCase(input)`: Validates feature entitlement.
- `getTenantUsageOverviewUseCase(tenantId, repo)`: Aggregates resource meters and feature states for the UI.
- `getPlatformBackofficeOverviewUseCase(isSuperadmin, repo)`: Generates global platform MRR and tenant table.

### 3. Infrastructure (`src/infrastructure/`)
- `SupabaseSubscriptionRepository`: Handles Supabase queries with live resource counting across `sites`, `site_domains`, `site_campaigns`, and `site_media_assets`.
- `MockBillingGateway`: Simulates checkout and portal URL generation.

---

## User Interface & Endpoints

### 1. `/admin/billing.astro`
- Current plan badge, active/trialing status badge, and trial countdown alert.
- Interactive quota progress meters with percentage bars (turning red when exceeding 90%).
- Plan upgrade/downgrade cards with instant self-service activation for tenant owners.

### 2. `/backoffice/index.astro`
- Restricted to verified platform superadmins (via `isPlatformSuperadmin`).
- High-level KPIs: Total Tenants, Active Subscriptions, Active Trials, and Estimated MRR.
- Tenant subscription table with in-place administrative plan overrides.

---

## Verification & Test Metrics
- **Vitest**: 41 test suites, 201 tests passing (0 failures).
- **Astro Check**: `0 errors, 0 warnings, 0 hints` across 160 files.
- **Astro SSR Build**: Clean production bundle compilation in 1.21s.
