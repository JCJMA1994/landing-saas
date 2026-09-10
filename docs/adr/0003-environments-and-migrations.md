# ADR 0003: Environments and migrations

Status: Accepted as an operating contract; hosted environments are not provisioned.

Development and CI use disposable local Supabase. Staging and production must
use separate hosted projects and secret stores. Only timestamped files under
`supabase/migrations/` are executable migrations; `database/` remains reference
material. Applied shared migrations are immutable and evolve forward.

Promotion requires unit, type, build and database evidence followed by explicit
target approval. Application rollback restores a compatible build. Database
rollback normally uses a corrective forward migration; destructive rollback
requires a separately reviewed restore plan. Never run `db reset` on staging
or production.
