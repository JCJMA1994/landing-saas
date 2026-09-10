# Seguridad

Amenazas: cross-tenant access, escalación de rol, key leakage, uploads maliciosos, XSS, domain hijack, cache leakage, campaign override inseguro.

## Obligatorio
- RLS en tablas expuestas.
- Grants mínimos.
- `service_role` solo server-side.
- cliente Supabase autenticado por request.
- schemas de input en Actions.
- no HTML/CSS/JS arbitrario de tenants.
- uploads con MIME/size/dimension allowlist.
- SVG deshabilitado inicialmente o sanitizado estrictamente.
- cache key incluye tenant/site/publication.
- campaña nunca puede introducir scripts, estilos libres o URLs no validadas.
- acciones sensibles auditadas.

## Campaign security
Los overrides aceptan únicamente claves tipadas y allowlisted. Colores validados, URLs normalizadas, media referenciada por `media_asset_id`, decoraciones referenciadas por `decoration_key`.
