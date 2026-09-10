# Fase 5 — Multi-template

## Resumen Ejecutivo
La Fase 5 implementa el registro versionado de templates y la matriz de compatibilidad de secciones, tokens y campañas estacionales conforme a **`skills/feature-builder.skill.md`**, **`skills/creative-direction.skill.md`** y las reglas arquitectónicas de multi-tenancy. Permite el cambio seguro de templates preservando la integridad de datos, advirtiendo sobre slots degradados y aplicando variantes de diseño sugeridas de forma opcional.

---

## Principios Arquitectónicos

1. **Catálogo Versionado de Templates (`registry.ts`)**:
   - Cada uno de los 6 templates cuenta con versión declarativa (`version: 1`), metadatos de dirección visual, matriz de secciones soportadas (`hero`, `cards`, `promotions`, `contact`), slots de campañas soportados (`banner`, `hero_badge`, `accent_tint`, `decorations`), y restricciones de tokens (`tokenConstraints`).
2. **Matriz de Compatibilidad & Graceful Degradation (`compatibility.ts`)**:
   - Al evaluar un cambio de template, el motor analiza:
     - **Campañas Activas**: Si una campaña requiere el slot `decorations` pero el template destino (`system-monitor`, `tech-editorial`) tiene una dirección artística sobria/minimalista que no lo renderiza, se genera un warning informativo (`CAMPAIGN_DECORATIONS_DEGRADED`) y la campaña degrada limpiamente sin decoraciones, sin romper el sitio ni lanzar errores.
     - **Secciones Activas**: Verifica que el contenido existente (cards, promociones, contacto) esté soportado.
     - **Tokens de Diseño**: Detecta si la tipografía o radio de borde actual se aparta de la dirección artística del template destino y genera sugerencias armónicas.
3. **No Corrupción ni Pérdida de Datos**:
   - El cambio de template modifica únicamente `sites.template_key`. No destruye, borra ni muta los datos de Hero, Cards, Promociones o Campañas existentes. Si el tenant regresa a un template anterior, su contenido se conserva íntegro.
4. **Variantes de Diseño Sugeridas (Opcional)**:
   - Al cambiar de template, el administrador puede marcar la opción para sincronizar automáticamente el tema base con las variantes recomendadas del template (`fontKey`, `radiusKey`, `buttonVariant`, `cardVariant`), alineando la identidad visual con un solo clic.
5. **Auditoría Estricta**:
   - Toda operación de cambio de template queda registrada de forma inmutable en `public.audit_log` con acción `site_template.switched`, detallando el template anterior, el nuevo, la versión del template y si se aplicaron variantes de diseño.

---

## Matriz de Compatibilidad de Templates

| Template Key | Versión | Tipografía Recomendada | Radio Recomendado | Botón / Card | Secciones Soportadas | Slots de Campaña Soportados |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `tech-diagnostic` | v1.0 | `space-grotesk` | `subtle` | `solid` / `glass` | Todas | `banner`, `hero_badge`, `accent_tint`, `decorations` |
| `repair-workshop` | v1.0 | `roboto` | `subtle` | `solid` / `bordered` | Todas | `banner`, `hero_badge`, `accent_tint`, `decorations` |
| `system-monitor` | v1.0 | `space-grotesk` | `subtle` | `solid` / `glass` | Todas | `banner`, `hero_badge`, `accent_tint` *(decoraciones degradadas)* |
| `tech-editorial` | v1.0 | `inter` | `sharp` | `ghost` / `flat` | Todas | `banner`, `hero_badge`, `accent_tint` *(decoraciones degradadas)* |
| `cyber-performance` | v1.0 | `space-grotesk` | `sharp` | `gradient` / `glass` | Todas | `banner`, `hero_badge`, `accent_tint`, `decorations` |
| `friendly-tech` | v1.0 | `outfit` | `rounded` | `solid` / `elevated` | Todas | `banner`, `hero_badge`, `accent_tint`, `decorations` |

---

## Componentes y Archivos

- **Dominio**:
  - `src/domain/template/registry.ts`: Registro central con tipado estricto `RegisteredTemplate`, `TemplateTokenConstraints`, constantes y funciones de consulta (`getRegisteredTemplate`, `listRegisteredTemplates`, `supportsSection`, `supportsCampaignSlot`).
  - `src/domain/template/compatibility.ts`: Motor de compatibilidad `checkTemplateCompatibility` que emite `TemplateCompatibilityReport` con advertencias y sugerencias de diseño.
- **Aplicación**:
  - `src/application/template/manage-template-registry.ts`: Casos de uso `evaluateTemplateSwitchUseCase` y `switchSiteTemplateUseCase` con control de permisos RBAC (`canEditContent`), actualización atómica del template y del tema (en caso de solicitar variantes), y logging de auditoría en `public.audit_log`.
- **Acciones y UI**:
  - `src/actions/index.ts`: Acción `saveSiteTemplate` extendida con parsing de `applySuggestedVariants` invocando `switchSiteTemplateUseCase`.
  - `src/pages/admin/sites/[id]/template.astro`: Vista enriquecida con badges de versión, lista de slots de campaña soportados, feedback visual de compatibilidad con campañas activas y checkbox para aplicar variantes de diseño sugeridas.
- **Tests**:
  - `tests/unit/template-compatibility.test.ts`: Validación de integridad del registro, límites de tokens y degradación de slots de campaña.
  - `tests/unit/template-switch.test.ts`: Validación de permisos RBAC, persistencia de template, aplicación condicional de variantes de tema y auditoría inmutable.

---

## Verificación
- **146 tests unitarios y de integración**: PASS (28 suites).
- **Astro Check**: 0 errores, 0 warnings, 0 hints en 116 archivos.
- **Astro Build (SSR)**: Generación exitosa de bundles de producción sin inconsistencias.
