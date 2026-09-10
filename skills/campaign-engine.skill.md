# Skill: Campaign Engine

## Trigger
Crear/editar/programar campañas o seasonal themes.

## Objective
Aplicar personalización temporal sin duplicar landing.

## Hard constraints
- Overrides allowlisted.
- Tiempo/status/priority determinista.
- una campaña primaria MVP.
- timezone explícito.
- graceful fallback.
- no raw CSS/JS/HTML.

## Workflow
1. Seleccionar preset/type.
2. Validar compatibilidad template.
3. Definir intensity.
4. Configurar schedule.
5. Validar overrides/assets.
6. Preview en fecha simulada.
7. Persistir draft.
8. Programar/publicar.
9. Tests before/during/after.

## Definition of Done
Campaña activa solo en ventana esperada, no rompe marca, mobile, a11y ni tenant isolation.
