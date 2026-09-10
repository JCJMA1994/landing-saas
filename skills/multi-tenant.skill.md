# Skill: Multi-Tenant Isolation

## Trigger
Toda feature con datos/site/cache.

## Objective
Garantizar aislamiento.

## Hard constraints
- Ownership path.
- No confiar IDs cliente.
- Cache keys con tenant/site.

## Workflow
Resolver ownership, membership, RLS y denial tests.

## Definition of Done
A accede A; A no accede B por ningún vector.
