# AGENTS.md

Antes de modificar este repositorio:

1. Lee `rules/00-global.md`.
2. Lee las reglas de tecnología afectada.
3. Usa `skills/feature-builder.skill.md` como orquestador por defecto.
4. Para diseño consulta `skills/creative-direction.skill.md` y `skills/design-system.skill.md`.
5. Para campañas consulta `skills/campaign-engine.skill.md`.
6. Para datos/seguridad consulta `skills/database.skill.md`, `skills/multi-tenant.skill.md` y `skills/security-rls.skill.md`.

## Prioridad de reglas
1. Seguridad y tenant isolation
2. Integridad de datos
3. Arquitectura
4. Publicación consistente
5. Accesibilidad
6. Correctitud
7. Rendimiento
8. Calidad visual
9. Conveniencia del desarrollador

## Reglas no negociables
- No confiar en `tenant_id` o `site_id` enviados por cliente.
- No exponer `service_role`.
- No permitir HTML/CSS/JS arbitrario de tenants.
- No mezclar draft y published.
- No duplicar una landing completa por cada campaña.
- No crear variantes visuales que solo cambien colores: cada template debe tener una dirección visual propia.
- Toda campaña debe degradar de forma segura al theme base.
- Una tarea no está completa solo porque la UI funcione.
