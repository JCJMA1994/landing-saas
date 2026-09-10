# Skill: Draft Preview Publishing

## Trigger
Publish/history/rollback.

## Objective
Publicación atómica.

## Hard constraints
- Draft/live separados.
- immutable snapshot.
- rollback genera nueva versión.

## Workflow
Validate -> snapshot -> persist -> activate -> cache -> audit -> verify.

## Definition of Done
No partial live state y versión recuperable.
