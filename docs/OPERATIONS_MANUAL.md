# Landing SaaS — Deployment & Operations Manual

This comprehensive guide covers production deployment (Vercel, Cloudflare, Docker/Node), DNS configuration (subdomains & custom domains), user and tenant provisioning, and the complete day-to-day operational workflow.

---

## 1. Prerequisites & Environment Configuration

### Required Environment Variables
Configure the following in your hosting provider's dashboard (e.g., Vercel / Cloudflare / Docker `.env`):

| Variable | Description | Example |
| :--- | :--- | :--- |
| `PUBLIC_SUPABASE_URL` | Supabase Project URL | `https://xyzcompany.supabase.co` |
| `PUBLIC_SUPABASE_ANON_KEY` | Public client key (safe for browser) | `eyJhbGciOi...` |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only secret key | `eyJhbGciOi...` |
| `APP_HOSTNAME` | Main platform hostname | `landingsaas.com` |
| `APP_ENV` | Runtime environment (`development`, `staging`, `production`) | `production` |
| `BILLING_WEBHOOK_SECRET` | Secret to verify inbound billing webhooks | `whsec_...` |

### Database Initialization (Supabase)
Run the SQL migrations located in `supabase/migrations/` in chronological order using the Supabase Dashboard SQL Editor or Supabase CLI (`npx supabase db push`):
1. `20260909000000_tenant_foundation.sql`
2. `20260910000000_audit_and_members.sql`
3. `20260911000000_theme_and_hero.sql`
4. `20260912000000_cards_promotions_contacts.sql`
5. `20260913000000_media_assets.sql`
6. `20260914000000_site_template_key.sql`
7. `20260915000000_publications_and_snapshots.sql`
8. `20260916000000_campaign_engine.sql`
9. `20260917000000_domains_and_observability.sql`
10. `20260918000000_seo_and_analytics.sql`
11. `20260919000000_saas_subscriptions_and_backoffice.sql`
12. `20260920000000_scale_jobs_webhooks_cdn.sql`

---

## 2. Deployment Options

### Option A: Vercel (Recommended for Serverless SSR & Multi-Tenant Wildcards)

1. **Install Vercel Adapter**:
   ```bash
   npm install @astrojs/vercel
   ```
2. **Update `astro.config.mjs`**:
   ```javascript
   import { defineConfig } from "astro/config";
   import node from "@astrojs/node";
   import vercel from "@astrojs/vercel";

   export default defineConfig({
     output: "server",
     adapter: process.env.VERCEL ? vercel() : node({ mode: "standalone" }),
   });
   ```
3. **Connect Repository to Vercel**:
   - Push your repository to GitHub.
   - Go to [vercel.com](https://vercel.com) -> "Add New Project" -> Select `landing-saas`.
   - Under **Environment Variables**, add the variables listed in Section 1.
   - Deploy.
4. **Wildcard Domain on Vercel**:
   - In your Vercel Project Settings -> **Domains** -> Add `*.landingsaas.com` and `landingsaas.com`.

---

### Option B: Cloudflare Pages / Workers

1. **Install Cloudflare Adapter**:
   ```bash
   npm install @astrojs/cloudflare
   ```
2. **Configure Node Compatibility**:
   - In `astro.config.mjs`:
     ```javascript
     import cloudflare from "@astrojs/cloudflare";
     export default defineConfig({
       output: "server",
       adapter: cloudflare({ platformProxy: { enabled: true } }),
     });
     ```
   - In Cloudflare Pages Settings -> **Functions** -> **Compatibility Flags** -> Add `nodejs_compat`.
3. **Environment Variables**:
   - Add environment variables under **Settings** -> **Environment Variables**.

---

### Option C: Standalone Node / Docker (Railway, Render, Fly.io, VPS)

The project is already preconfigured with `@astrojs/node` in standalone mode.

1. **Build the Application**:
   ```bash
   npm run build
   ```
2. **Run in Production**:
   ```bash
   node ./dist/server/entry.mjs
   ```
   *(Listens on port 4321 by default, or the port specified by `PORT` / `HOST` environment variables).*

---

## 3. Domain & Subdomain Configuration Flow

The platform supports 3 routing modes handled transparently by `src/middleware.ts` and `src/domain/tenant/host.ts`:

### 1. Platform Host (`landingsaas.com`)
- Serves the marketing homepage, `/admin` workspace, `/backoffice`, and `/sites/[slug]` public previews.
- **DNS**:
  - `A` or `CNAME` pointing `landingsaas.com` to your deployment IP or CNAME target.

### 2. Automatic Tenant Subdomains (`<tenant>.landingsaas.com`)
- Directly renders the active publication for that tenant's primary site at root `/`.
- **DNS**:
  - Add a wildcard DNS record: `CNAME *.landingsaas.com` -> `landingsaas.com`.

### 3. Custom Domains (`clientdomain.com` / `www.clientdomain.com`)
Tenant sites can map their own external domains with zero platform branding:
1. Tenant goes to `/admin/sites/[id]/domains`.
2. Enters domain (e.g., `tallerelrayo.pe`).
3. The platform generates two verification instructions:
   - **CNAME Record**: `tallerelrayo.pe` -> `cname.landingsaas.com`
   - **TXT Verification Challenge**: `_saas-challenge.tallerelrayo.pe` -> `saas-verify-<uuid>`
4. The client adds both records in their domain registrar (GoDaddy, Cloudflare, Namecheap).
5. The admin clicks **Verify DNS**. The platform uses `NodeDnsGateway` to confirm the TXT challenge, activates SSL status, and begins serving the site at `https://tallerelrayo.pe/`.

---

## 4. User Provisioning & Permissions Flow

### 1. Account Creation (Authentication)
- Users sign up or log in at `/admin/login` using email/password.
- Accounts are registered in Supabase Auth (`auth.users`).

### 2. Adding Users to a Tenant Organization
1. Log in with a tenant `owner` or `admin` account.
2. Navigate to `/admin/members`.
3. Fill out the **Add Member** form:
   - **User Email / ID**: UUID from `auth.users`.
   - **Role**:
     - `admin`: Can manage team members, sites, publishing, domains, and view audit logs.
     - `editor`: Can edit site content, themes, heroes, and campaigns.
     - `viewer`: Read-only access to drafts and analytics.
4. Click **Add Member**. RLS validates that only owners/admins can assign roles.

### 3. Granting Platform Superadmin (Backoffice Access)
To grant an operator access to `/backoffice` (viewing all tenants, platform MRR, and overriding subscriptions):
```sql
INSERT INTO public.platform_superadmins (user_id)
VALUES ('<USER_UUID_FROM_AUTH_USERS>')
ON CONFLICT DO NOTHING;
```

---

## 5. End-to-End Operational Workflow

```
[1. User Logs In]
       │
       ▼
[2. Access Admin Workspace (/admin)]
       │
       ├─► [Theme]: Customize palette, fonts, radii & button variants.
       ├─► [Hero & Content]: Set headline, subheadline, CTAs, and badges.
       ├─► [Modules]: Manage Cards (Services), Promotions, and WhatsApp Contacts.
       ├─► [Template]: Switch templates with automatic compatibility evaluation.
       ├─► [Campaigns]: Activate seasonal presets (Navidad, Fiestas Patrias, Custom).
       │
       ▼
[3. Publish Site (/admin/sites/[id]/publish)]
       │
       ├─► Creates immutable Publication Snapshot (Version N+1).
       ├─► Calculates deterministic SHA-256 Checksum.
       ├─► Emits Edge Caching headers (s-maxage=3600, stale-while-revalidate=86400, ETag).
       └─► Triggers instant CDN cache purge via CdnInvalidationGateway.
       │
       ▼
[4. Connect Custom Domain (/admin/sites/[id]/domains)]
       │
       ├─► Add domain & configure CNAME/TXT records.
       └─► Click "Verify DNS" -> Site is live on custom domain with zero platform branding.
       │
       ▼
[5. Monitor Analytics & Conversions (/admin/sites/[id]/analytics)]
       │
       ├─► Real-time cookieless telemetry (Views, WhatsApp clicks, CTA clicks).
       └─► Zero third-party cookies, compliant with GDPR/ePrivacy.
```
