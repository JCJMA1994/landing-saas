# Skill: Media & Storage

## Trigger
Uploads/media.

## Objective
Assets seguros y tenant-scoped.

## Hard constraints
- MIME allowlist.
- limits.
- RLS.
- no arbitrary SVG.

## Workflow
Purpose -> bucket/path -> validate -> upload -> metadata -> lifecycle -> tests.

## Definition of Done
Uploads seguros, aislados y optimizables.
