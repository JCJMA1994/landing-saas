# Phase 1: Admin MVP (Status: Completed)

Phase 1 was delivered through five sequential, audited vertical slices. All administrative features operate strictly in Draft Mode with end-to-end multi-tenant isolation, RLS enforcement, and clean architecture separation.

## Slice 1: authentication and accessible sites

### Available now

1. A preprovisioned user signs in at `/admin/login` with email and password.
2. Middleware verifies the session with Supabase `getUser()` and guards `/admin`.
3. The dashboard lists only rows returned by the existing `sites` RLS policy.
4. Sign out ends only the current browser session with local scope.

Authentication failures are intentionally generic. The listing accepts no tenant or site identifier: the authenticated database session and RLS determine visibility.

### Intentionally out of scope

- Sign-up, invitations and membership changes
- Site creation or editing
- Theme, content, media and storage
- Draft, preview, publish and public rendering

## Verification

```sh
pnpm test
pnpm check
pnpm build
```

The unit suite covers login failure sanitization, local-scope logout, the admin guard, the application use case, repository mapping and failure handling, and the zero-JavaScript login contract. A real Supabase auth/RLS runtime remains required before this slice can be called production-proven.

## Security boundaries

- Middleware identity comes from `getUser()`, not unverified cookie payloads.
- Astro Actions validate form input and never log credentials or provider payloads.
- `/admin/login` is public; protected pages and actions authorize from `locals.user`.
- No service-role key or new database write grant is introduced.

## Slice 2: audited membership and permissions

### Available now

1. Members view other members of their tenant at `/admin/members`.
2. Owners and Admins can assign and update member roles (`admin`, `editor`, `viewer`). Only Owners can assign or promote to `owner`.
3. Owners and Admins can remove members with equal or lesser privileges.
4. Protection of the last owner: demoting or removing the sole owner of a tenant is rejected at both application and policy layers.
5. All membership mutations append an immutable event to `public.audit_log`.
6. Owners and Admins can review recent activity from `public.audit_log` directly on `/admin/members`.
7. Astro Actions (`assignMember`, `removeMember`) enforce strict Zod UUID/enum validation, require an authenticated user, and sanitize errors.
8. Zero-JavaScript HTML forms support adding and removing members seamlessly.

### Security boundaries

- `public.audit_log` forces RLS and is append-only for authenticated actors; update and delete privileges are revoked.
- Recursive RLS on `tenant_members` is avoided using a secure definer helper function `current_user_tenant_role`.
- Privilege escalation is prevented across all vectors: an admin cannot add or demote an owner.
- An outsider cannot read memberships, modify roles, or view audit logs for unauthorized tenants.

## Slice 3: site theme and hero (draft mode)

### Available now

1. Theme base tokens configuration for sites at `/admin/sites/[id]/theme`.
2. Color tokens strictly validated using 6-character hex regex (`#RRGGBB`).
3. Typography (`inter`, `roboto`, `outfit`, `space-grotesk`), border radius (`sharp`, `subtle`, `rounded`, `pill`), button variants and card variants chosen from strict allowlists.
4. Hero section copy and action configuration at `/admin/sites/[id]/hero`.
5. Strict length checks and link security validation preventing unsafe URL schemes (`javascript:`, `data:`).
6. Live component and palette visual token previews directly in the admin dashboard.
7. Explicit draft mode indicator (`DRAFT (Borrador)`) on all editable content, isolating it from public delivery until Phase 3 publication.
8. Audit events (`site_theme.updated`, `site_hero.updated`) recorded on every mutation.

### Security boundaries

- `public.site_theme` and `public.site_hero` tables force RLS.
- Only members with role `owner`, `admin`, or `editor` in the owning tenant can mutate theme and hero; `viewer` is restricted to read-only.
- All forms degrade cleanly without client-side JavaScript via standard POST and Astro Actions.

## Slice 4: feature cards, promotions, and contact channels (draft mode)

### Available now

1. Modular cards management at `/admin/sites/[id]/cards` with sort ordering, icon allowlisting, and safe link validation.
2. Promotional offers management at `/admin/sites/[id]/promotions` with discount labels, coupon codes, and chronological date validation.
3. Conversion and communication channels management at `/admin/sites/[id]/contacts` with international E.164 WhatsApp numbers, custom pre-filled message, Instagram handle, Facebook URL, and contact phone/email.
4. WhatsApp direct chat link generator with test link in the admin dashboard.
5. Persistent draft mode: all cards, promotions, and contact records remain in draft until publication.
6. Audit logging: every card, promotion, and contact change triggers an event in `public.audit_log`.
7. Sub-navigation tabs across all site management sections (Theme, Hero, Cards, Promotions, Contacts).

### Security boundaries

- `public.site_cards`, `public.site_promotions`, and `public.site_contacts` enforce RLS.
- Only tenant members with `owner`, `admin`, or `editor` roles can create, update, or delete cards, promotions, or contacts. `viewer` is restricted to read-only.
- Strict input validations on telephone numbers (E.164), Instagram handles, dates (`ends_at > starts_at`), and link URLs.

## Slice 5: storage and media asset management (draft mode)

### Available now

1. Media asset upload and management at `/admin/sites/[id]/media`.
2. Storage bucket `site-assets` configured with 5MB max file limit and strict MIME allowlist (`image/jpeg`, `image/png`, `image/webp`).
3. Asset metadata cataloged in `public.media_assets` with public URL resolution and storage path tracking.
4. Asset deletion with synchronization between Supabase Storage and `media_assets` table.
5. Storage asset cards with copyable image URLs, file dimensions/size display, and image preview.
6. Audit logging: every upload (`media_asset.uploaded`) and deletion (`media_asset.deleted`) records an event in `public.audit_log`.
7. Zero-JS multipart file upload form with fallback handling.

### Security boundaries

- Storage bucket `site-assets` enforces RLS:
  - Read access is restricted to members of the owning tenant.
  - Insert and Delete permissions require `owner`, `admin`, or `editor` roles. `viewer` cannot mutate assets.
  - Storage paths are strictly prefixed with `tenant_id/site_id/` to guarantee tenant isolation at the filesystem layer.
- `public.media_assets` enforces row-level security mapped via tenant membership.
- Server-side validation enforces mime type allowlisting and 5MB size limit.

## Phase 1 completion summary

Phase 1 is 100% completed and verified across all 5 vertical slices:
- **Slice 1**: Authentication and accessible sites.
- **Slice 2**: Audited membership and permissions (RBAC + `audit_log`).
- **Slice 3**: Site theme and hero copy/links (draft mode + live preview).
- **Slice 4**: Feature cards, promotions, and contact channels (WhatsApp E.164 + test link).
- **Slice 5**: Media asset upload and storage (bucket RLS + MIME allowlist).

### Quality and verification metrics
- 100 unit and integration tests passing (`npx vitest run`).
- 0 TypeScript / Astro diagnostic errors (`npx astro check`).
- SSR build passes cleanly (`npx astro build`).
- Zero-JavaScript degradation for all administrative forms.
