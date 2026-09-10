# Fase 4 — Campaign Engine

## Resumen Ejecutivo
La Fase 4 implementa el motor de campañas y temas estacionales temporales conforme a **`skills/campaign-engine.skill.md`** y **`rules/campaigns.md`**, garantizando que ninguna campaña duplique una landing completa ni altere destructivamente la identidad visual base del sitio.

---

## Principios Arquitectónicos

1. **Slots Allowlisted (No Duplicación de Landing)**:
   - Una campaña interviene únicamente sobre ranuras permitidas:
     - **Top Banner / Anuncio**: Texto, badge, enlace directo y countdown.
     - **Hero Seasonal Badge**: Distintivo contextual del Hero.
     - **Accent Color Tint**: Acento estacional en intensidades `balanced` y `festive`, preservando contraste accesible WCAG AA y la tipografía base.
2. **Graceful Fallback**:
   - Si no hay campañas en ventana activa o una campaña finaliza, el sitio degrada automáticamente al tema y estructura base sin interrupciones ni código residual.
3. **Resolución Determinista**:
   - La campaña ganadora se determina por:
     1. Estado: `status in ('active', 'scheduled')`.
     2. Ventana de tiempo UTC: `starts_at <= now <= ends_at`.
     3. Prioridad: `priority DESC`.
     4. Desempate: Fecha de inicio más reciente (`starts_at DESC`) y finalmente `id DESC`.
4. **Time-Travel Simulation**:
   - En el modo de previsualización (`/preview/[id]?simulateDate=...`), los editores pueden simular cualquier fecha y hora futura para validar cómo responderá el sitio antes del lanzamiento oficial, sin alterar el entorno público.
5. **Accesibilidad & Motion Safety**:
   - Las animaciones respetan estrictamente la directiva `prefers-reduced-motion`.
   - El countdown se ejecuta como mejora progresiva sobre HTML/CSS semántico.

---

## Presets Oficiales

| Preset | Nombre | Emojis / Identidad | Acento por Defecto | Slots Habituales |
| :--- | :--- | :--- | :--- | :--- |
| `fiestas-patrias` | Fiestas Patrias | 🇵🇪 Nacional / Feriado patrio | `#dc2626` | Banner, Badge Patrio, Countdown |
| `navidad` | Navidad & Nochebuena | 🎄 Navideño / Nochebuena | `#15803d` | Banner festivo, Countdown a medianoche, Badge |
| `ano-nuevo` | Año Nuevo | ✨ Gala / Nuevo ciclo | `#d97706` | Acentos dorados, Countdown, Promoción anual |
| `custom` | Personalizada | ⚡ Campaña comercial libre | `#6366f1` | Configurable libremente |

---

## Niveles de Intensidad

- **`subtle`**: Muestra únicamente el banner superior de anuncio y el badge en el Hero. Conserva intactos todos los colores del tema base.
- **`balanced`**: Banner con countdown opcional, badge de Hero y acento semántico en elementos de énfasis.
- **`festive`**: Banner prominente con sombra y gradiente temático, countdown en vivo y acentos estacionales completos.

---

## Componentes y Archivos

- **Base de Datos**: `supabase/migrations/20260916000000_campaign_engine.sql`
- **Dominio**:
  - `src/domain/campaign/campaign.ts`: Entidad `SiteCampaign`, constantes y validador de fechas.
  - `src/domain/campaign/presets.ts`: Catálogo de presets estacionales y overrides permitidos.
  - `src/domain/campaign/resolver.ts`: Algoritmo determinista de resolución temporal.
- **Aplicación**:
  - `src/application/campaign/campaign-repository.ts`: Puerto de persistencia.
  - `src/application/campaign/manage-campaigns.ts`: Casos de uso `saveCampaignUseCase`, `deleteCampaignUseCase`, `resolveSiteCampaignUseCase` y auditoría en `public.audit_log`.
- **Infraestructura**:
  - `src/infrastructure/supabase/campaign-repository.ts`: Adaptador de persistencia Supabase.
- **UI & Templates**:
  - `src/components/campaign/CampaignBanner.astro`: Banner accesible con timer regresivo en vivo.
  - `src/components/templates/TemplateRenderer.astro`: Inyección de slots allowlisted sin duplicar templates.
- **Administración & Preview**:
  - `src/actions/index.ts`: Acciones form `saveCampaign` y `deleteCampaign`.
  - `src/pages/admin/sites/[id]/campaigns.astro`: Consola de programación y simulación temporal.
  - `src/pages/preview/[id].astro`: Previsualización con Time-Travel (`?simulateDate=...`).
  - `src/pages/sites/[slug].astro`: Landing pública con resolución en tiempo real.

---

## Métricas de Verificación
- **136/136 tests pasando** en 26 test suites (`npx vitest run`).
- **Astro / TypeScript**: 0 errores, 0 advertencias, 0 hints en 111 archivos (`npx astro check`).
- **Build SSR**: Compilación limpia en 1.25s (`npx astro build`).
