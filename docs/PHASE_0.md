# Phase 0: Foundation

Phase zero provides the Astro SSR shell, runtime configuration, tenant boundary,
Supabase migration, RLS tests and CI. It is not an admin SaaS, published landing
renderer, hosted environment or completed deployment.

## Local setup

Prerequisites: the Node version in `.node-version`, pnpm 11.19.0, Supabase CLI
2.117.0 and Docker.

1. Run `pnpm install --frozen-lockfile`.
2. Run `supabase start`.
3. Copy `.env.example` to `.env` and insert the local publishable/anon key.
4. Run `pnpm dev`.

Never use a service-role or secret key in the application. The empty example
key intentionally causes a safe runtime failure.

## Verification

```sh
pnpm test
pnpm check
pnpm build
supabase db reset --local
supabase test db
```

`db reset --local` destroys the disposable local database. The CI database job
uses no hosted credentials. A configured check is not a passing check until it
has actually run.

The `/health` endpoint is liveness only. It does not prove database connectivity,
migration state, authentication or tenant isolation.

## Runtime boundary

- `APP_ENV`: development, staging or production.
- `APP_HOSTNAME`: canonical lowercase hostname without scheme, path or port.
- `SUPABASE_URL`: clean HTTPS origin; local HTTP only in development.
- `SUPABASE_PUBLISHABLE_KEY`: publishable key or legacy anon JWT.

Unknown hosts return 421. Invalid configuration returns 503 without logging
secrets. The reverse proxy must terminate TLS and reject unexpected hosts.

## Delivered versus proven

| Area | Delivered | Proof still needed |
| --- | --- | --- |
| App | SSR shell, middleware, unit tests | typecheck, build, runtime smoke |
| DB | migration and pgTAP suite | local replay and pgTAP PASS |
| CI | application and DB jobs | green run in an actual Git repository |
| Ops | environment/rollback contracts | hosted provisioning and restore drill |

The existing files under `database/`, `config/` and `examples/` remain blueprint
references and are not a second migration system.
