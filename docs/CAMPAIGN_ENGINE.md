# Campaign / Seasonal Theme Engine

## Propósito
Permitir que una landing cambie temporalmente para Navidad, Fiestas Patrias, Año Nuevo, aniversarios, Cyber, lanzamientos u otras fechas sin duplicar páginas ni romper la identidad visual.

## Regla de composición
```text
Base Theme -> Template -> Brand -> Active Campaign -> Section Override
```

## Resolución de campaña activa
1. `status in (scheduled, active)`
2. `starts_at <= now < ends_at`
3. ordenar por `priority desc`, luego `starts_at desc`
4. aplicar solo una campaña primaria en MVP
5. si no hay campaña válida, usar brand theme sin error

## Intensidad
- `subtle`: badge + CTA + accent
- `balanced`: hero + accent + announcement + promo
- `festive`: balanced + decorations + optional safe animation

## Overrides permitidos
- semantic accent colors
- hero copy/media/layout variant
- announcement bar
- promo block
- CTA labels/links
- decoration preset
- safe motion preset

## No permitido
- CSS libre
- JS libre
- HTML libre
- reemplazar template completo desde campaña
- mutar ownership/auth/security

## Scheduling
El usuario configura inicio/fin con timezone del site. El backend persiste UTC. El preview puede aceptar una `preview_at` solo para sesión autorizada, nunca para resolver la landing pública.

## Conflictos
MVP: una campaña primaria. Futuro: slots (`announcement`, `hero`, `promo`) con reglas explícitas, nunca merge arbitrario de objetos.

## Presets incluidos
- `fiestas-patrias-pe`
- `christmas-classic`
- `new-year-modern`
- `custom-campaign`
