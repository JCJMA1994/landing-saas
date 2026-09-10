# Fase 6 — Dominios y Operación

## Resumen Ejecutivo
La Fase 6 implementa la gestión de subdominios automáticos, dominios personalizados (*custom domains*), verificación criptográfica DNS (CNAME y TXT challenge), preparación de certificados SSL y observabilidad en runtime conforme a **`skills/multi-tenant.skill.md`**, **`skills/deployment.skill.md`** y las reglas arquitectónicas de aislamiento multi-tenant.

---

## Principios Arquitectónicos

1. **Aislamiento Multi-Tenant & Host Hinting**:
   - Cumple estrictamente la premisa fundamental: *"A host is a routing hint, never proof of identity or tenant membership"*.
   - El header `Host` orienta únicamente la resolución pública de la publicación inmutable activa. Los endpoints administrativos (`/admin/*`) están estrictamente aislados al dominio canónico de la plataforma (`appHostname`) y nunca pueden ser alcanzados ni mutados a través de subdominios de tenant ni custom domains.
2. **Subdominios Automáticos**:
   - Cada sitio publicado cuenta con un subdominio canónico instantáneo `<slug>.<appHostname>` que resuelve directamente su landing sin requerir rutas compuestas.
3. **Verificación DNS Criptográfica**:
   - Soporte para dos mecanismos de desafío DNS:
     - **CNAME**: Apunta `<custom-domain>` al host objetivo de la plataforma (ej. `cname.landingsaas.com`).
     - **TXT Challenge**: Registro TXT en `_saas-challenge.<custom-domain>` con un token aleatorio criptográfico (`saas-verify-<uuid>`).
   - El proceso de verificación es no destructivo y auditable, registrando eventos `domain.verified` en `public.audit_log`.
4. **Prevención de Domain Hijacking**:
   - Los dominios son normalizados en minúsculas y poseen una restricción de unicidad global en la tabla `public.site_domains` (`site_domains_domain_unique`), impidiendo que dos sitios distintos reclamen el mismo dominio.
5. **Observabilidad y Telemetría en Runtime**:
   - Header estándar `Server-Timing: total;dur=...` en todas las respuestas HTTP para profiling de latencia.
   - Endpoint de salud y readiness `/api/health` con monitoreo de conectividad a base de datos, uptime y métricas de consumo de memoria.
   - Errores de petición estructurados en formato JSON con correlación `requestId`.

---

## Componentes y Archivos

- **Base de Datos & RLS**:
  - `supabase/migrations/20260917000000_domains_and_observability.sql`:
    - Tabla `public.site_domains` con constraints de formato, índices de búsqueda rápida y políticas RLS para control por tenant.
- **Dominio**:
  - `src/domain/tenant/host.ts`: `HostRoutingContext` y función `classifyRoutingHost` para enrutamiento limpio entre plataforma, subdominios y dominios personalizados.
  - `src/domain/domain/site-domain.ts`: Validador de dominios según RFC 1035/1123 (`isValidDomain`), generador de tokens de verificación y calculador de registros DNS de desafío (`getDnsChallengeRecords`).
- **Aplicación**:
  - `src/application/domain/dns-gateway.ts`: Puerto `DnsResolverGateway`.
  - `src/application/domain/domain-repository.ts`: Puerto `DomainRepository`.
  - `src/application/domain/manage-domains.ts`: Casos de uso `addSiteDomainUseCase`, `verifySiteDomainUseCase`, `deleteSiteDomainUseCase` con RBAC y logging en `public.audit_log`.
- **Infraestructura**:
  - `src/infrastructure/dns/node-dns-gateway.ts`: Implementación nativa sobre `node:dns/promises`.
  - `src/infrastructure/supabase/domain-repository.ts`: Adaptador de persistencia en PostgreSQL con RLS.
- **Middleware & Observabilidad**:
  - `src/middleware.ts`: Cálculo de `Server-Timing`, extracción de `X-Request-Id` y aislamiento estricto de rutas `/admin`.
  - `src/pages/api/health.ts`: Endpoint `/api/health` con liveness probe.
- **UI & Acciones**:
  - `src/actions/index.ts`: Acciones form `addDomain`, `verifyDomain`, `deleteDomain`.
  - `src/pages/admin/sites/[id]/domains.astro`: Consola de administración de dominios con tablas de registros DNS, estados en vivo y botones de verificación.
  - `src/pages/index.astro`: Enrutamiento transparente que sirve la landing activa del sitio cuando el host entrante es un subdominio o un custom domain verificado.

---

## Verificación
- **168 tests unitarios y de integración**: PASS (32 suites).
- **Astro Check**: 0 errores, 0 warnings, 0 hints en 128 archivos.
- **Astro Build (SSR)**: Compilación exitosa en 1.46s.
