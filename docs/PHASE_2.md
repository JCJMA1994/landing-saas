# Phase 2: Design System & Visual Directions (Status: Completed)

Phase 2 establishes the semantic design system and the six distinct visual templates, ensuring that each landing template features its own compositional hierarchy, visual metaphor, and rhythm rather than mere color palette swaps.

## 1. Semantic Design Tokens & CSS Engine

- **Tokens CSS**: [src/styles/tokens.css](file:///d:/Proyectos/Frontend/landing-saas/src/styles/tokens.css) defines:
  - Font families: Inter, Roboto, Outfit, Space Grotesk, and monospace stacks.
  - Fluid responsive typography: from `--ds-text-xs` up to `--ds-text-display` via CSS `clamp()`.
  - Spacing scale: 4px base (`--ds-space-1` to `--ds-space-20`).
  - Radii presets: `sharp` (0px), `subtle` (4px), `rounded` (12px), `pill` (9999px).
  - Elevation presets: `flat`, `subtle`, `elevated`, and `floating`.
- **Domain Tokens Engine**: [src/domain/design-system/tokens.ts](file:///d:/Proyectos/Frontend/landing-saas/src/domain/design-system/tokens.ts) provides:
  - `themeToCssVariables`: converts a `SiteTheme` record into sanitized CSS variables.
  - WCAG 2.1 relative luminance and contrast calculations (`isWcagAaCompliant`, `getAccessibleTextColor`).

## 2. Template Manifest Domain & Registry

- **Domain Model**: [src/domain/template/manifest.ts](file:///d:/Proyectos/Frontend/landing-saas/src/domain/template/manifest.ts) declares typed manifests for all 6 authentic templates:
  1. `tech-diagnostic`: HUD-like telemetry panels, status chips, component matrices.
  2. `repair-workshop`: Workstation intake sheet, service tickets, modular parts.
  3. `system-monitor`: Real-time observability dashboard, ping indicators, node health.
  4. `tech-editorial`: Large scale typography, asymmetric layout, pull quotes.
  5. `cyber-performance`: High-octane kinetic energy, 45° chamfers, neon overclocking.
  6. `friendly-tech`: Welcoming curves, approachable cards, human micro-copy.
- **Config Sync**: [config/template-registry.config.ts](file:///d:/Proyectos/Frontend/landing-saas/config/template-registry.config.ts) synchronizes template versions and supported campaign slots.

## 3. Responsive Semantic Core Components

Located in `src/components/design-system/`:
- [Button.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/design-system/Button.astro): Accessible focus states, keyboard navigation, and variants (`solid`, `outline`, `ghost`, `gradient`).
- [Badge.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/design-system/Badge.astro): Semantic chips for status, discounts, and categories.
- [Card.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/design-system/Card.astro): Container cards for `flat`, `elevated`, `bordered`, and `glass` variations.
- [Icon.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/design-system/Icon.astro): Optimized inline SVGs for allowlisted icons (`wrench`, `cpu`, `shield`, `bolt`, `rocket`, `star`, `chart`, `heart`, etc.).
- [WhatsAppButton.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/design-system/WhatsAppButton.astro): Direct WhatsApp conversation bridge with official branding and safe links.

## 4. The 6 Visual Directions (Templates)

Located in `src/components/templates/`:
- [TechDiagnosticTemplate.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/templates/TechDiagnosticTemplate.astro)
- [RepairWorkshopTemplate.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/templates/RepairWorkshopTemplate.astro)
- [SystemMonitorTemplate.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/templates/SystemMonitorTemplate.astro)
- [TechEditorialTemplate.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/templates/TechEditorialTemplate.astro)
- [CyberPerformanceTemplate.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/templates/CyberPerformanceTemplate.astro)
- [FriendlyTechTemplate.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/templates/FriendlyTechTemplate.astro)
- [TemplateRenderer.astro](file:///d:/Proyectos/Frontend/landing-saas/src/components/templates/TemplateRenderer.astro): Dynamic component resolver based on `templateKey`.

## 5. Administration & Database Persistence

- **Migration**: [20260914000000_site_template_key.sql](file:///d:/Proyectos/Frontend/landing-saas/supabase/migrations/20260914000000_site_template_key.sql) adds `template_key` with check constraint to `public.sites`.
- **Astro Action**: `actions.saveSiteTemplate` validates tenant membership, RBAC role permissions, applies the update and appends an immutable event to `public.audit_log`.
- **Admin View**: [/admin/sites/[id]/template.astro](file:///d:/Proyectos/Frontend/landing-saas/src/pages/admin/sites/%5Bid%5D/template.astro) provides an interactive switcher with live visual preview of the draft site in the selected template.

## Verification Metrics

```bash
# 1. Full Vitest Test Suite
npx vitest run
# Output: 19 test files passed (19), 111 tests passed (111)

# 2. Astro Diagnostics
npx astro check
# Output: 0 errors, 0 warnings, 0 hints across 88 files

# 3. Production SSR Build
npx astro build
# Output: Complete in 1.26s
```
