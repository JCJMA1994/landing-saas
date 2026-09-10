# Fase 3 — Draft / Preview / Publish

## Resumen Ejecutivo
La Fase 3 implementa el ciclo de vida completo de publicación con separación estricta entre borrador (*draft*) y producción (*published*), garantizando inmutabilidad, trazabilidad criptográfica y auditoría según **ADR 0002**.

---

## Principios Arquitectónicos

1. **Aislamiento Total Draft vs. Published**:
   - Las páginas públicas (`/sites/[slug]`) leen única y exclusivamente de `site_publications` donde `is_active = true`.
   - Ninguna mutación realizada en las tablas de borrador (`site_theme`, `site_hero`, `site_cards`, `site_promotions`, `site_contacts`) impacta el sitio público hasta que se ejecute una publicación explícita.
2. **Snapshots Deterministas e Inmutables**:
   - Cada publicación emite un snapshot JSON canónico con ordenamiento lexicográfico recursivo de claves.
   - Cada snapshot es sellado con un hash criptográfico SHA-256 (`checksum`).
   - Una vez insertado en `site_publications`, el registro no puede ser modificado ni eliminado (`REVOKE DELETE ON public.site_publications FROM PUBLIC, authenticated, anon`).
3. **Rollbacks como Nuevas Versiones (ADR 0002)**:
   - Un rollback **nunca** muta ni reactiva un registro antiguo en la base de datos.
   - Obtiene el snapshot de la versión solicitada $V_{\text{target}}$, genera un nuevo snapshot con marca de tiempo actual, calcula un nuevo checksum y publica la versión $V_{\text{new}} = \max(\text{version}) + 1$.
   - Esto preserva una línea histórica de auditoría monótonamente creciente.
4. **Auditoría Estricta**:
   - Cada publicación registra un evento `site.published` con metadatos del checksum y versión.
   - Cada rollback registra `site.rolled_back` detallando `newVersion` y `rolledBackFromVersion`.

---

## Estructura de Componentes

### 1. Base de Datos & RLS
- **Archivo**: `supabase/migrations/20260915000000_publications_and_snapshots.sql`
- **Tabla**: `public.site_publications`
- **Índice parcial único**: `site_publications_site_active_idx` sobre `(site_id) WHERE (is_active = true)`.
- **Políticas RLS**:
  - Lectura pública: `SELECT` permitido para `is_active = true`.
  - Miembros del tenant: `SELECT` para cualquier versión de los sitios de su tenant.
  - Editores/Owners: `INSERT` y `UPDATE (is_active)`.
  - `DELETE`: Revocado totalmente a nivel de privilegios de Postgres.

### 2. Dominio
- **`src/domain/publication/snapshot.ts`**:
  - `PublicationSnapshot`: Estructura tipada con versión de esquema (`schemaVersion: 1`), metadatos del sitio, template, tema, hero, cards, promociones, contactos y timestamp.
  - `canonicalJsonStringify(obj)`: Serializador determinista.
  - `calculateSnapshotChecksum(snapshot)`: Generador de hash SHA-256 mediante Web Crypto API.
  - `validatePublicationSnapshot(raw)`: Validación rigurosa de esquema inmutable.
- **`src/domain/publication/publication.ts`**:
  - Entidad `SitePublication`.
  - `prepareRollbackSnapshot(targetPub)`: Generador de snapshot de reversión con nuevo timestamp.

### 3. Aplicación & Repositorios
- **`src/application/publication/publication-repository.ts`**: Puerto `PublicationRepository`.
- **`src/application/publication/manage-publication.ts`**: Casos de uso `publishSiteUseCase` y `rollbackSiteUseCase`.
- **`src/infrastructure/supabase/publication-repository.ts`**: Adaptador Supabase con secuenciación atómica de versiones y alternancia de estado activo.

### 4. Astro Actions & Interfaz de Administración
- **`src/actions/index.ts`**:
  - `publishSite`: Form action protegida que ensambla el borrador actual, calcula el checksum, crea la versión activa y audita el evento.
  - `rollbackSite`: Form action protegida que crea la versión de reversión inmutable.
- **`src/pages/admin/sites/[id]/publish.astro`**:
  - Monitor en vivo de estado de publicación.
  - Comparativa de sincronización (alerta si el borrador tiene cambios no publicados comparando checksums).
  - Botón de despliegue atómico a la próxima versión.
  - Tabla completa de historial con badges de estado, hashes SHA-256 y botones de reversión con confirmación.
  - Barra de navegación consistente en todas las páginas del admin (`template`, `theme`, `hero`, `cards`, `promotions`, `contacts`, `media`, `publish`).

### 5. Previsualización & Renderizado Público
- **`src/pages/preview/[id].astro`**:
  - Modo aislado para miembros del tenant.
  - Soporta borrador actual y snapshots históricos vía query param `?version=N`.
  - Banner contextual superior con información de versión y enlace de regreso al admin.
- **`src/pages/sites/[slug].astro`**:
  - Landing pública de alta velocidad que resuelve exclusivamente la publicación activa del sitio sin tocar tablas de borrador.
  - Si no existe publicación activa, presenta una pantalla "Sitio en Construcción".
- **`src/pages/index.astro`**:
  - Directorio público de sitios con versión activa en vivo y acceso al panel administrativo.

---

## Verificación & Métricas de Calidad
- **Tests Unitarios e Integración**: 122/122 tests pasando (22 suites en Vitest).
- **TypeScript & Astro Check**: 0 errores, 0 advertencias, 0 hints en 99 archivos.
- **Build SSR**: Compilación limpia en 2.00s con adapter `@astrojs/node`.
