# Skill: Supabase Integration

## Trigger
Auth/DB/Storage.

## Objective
Integrar Supabase detrás de adapters.

## Hard constraints
- Per-request client.
- RLS.
- service role server-only.
- migrations.

## Workflow
Contrato -> adapter -> migration -> RLS -> tests.

## Definition of Done
No cross-tenant, secretos aislados.
