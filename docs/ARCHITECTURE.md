# Arquitectura

## Contexto
```text
Internet -> Astro SSR -> Tenant Resolver -> Site -> Active Publication -> Design Engine -> Render
                                      \-> /admin -> Auth -> Actions -> Application -> DB/Storage
```

## Capas
### Presentation
Astro para páginas públicas y shell del admin. React solo para interacción compleja.

### Application
Casos de uso: `UpdateTheme`, `UpdateHero`, `CreateCard`, `ScheduleCampaign`, `PublishSite`, `RollbackPublication`, `AssignDomain`.

### Domain
`Tenant`, `Site`, `Theme`, `Template`, `Campaign`, `Publication`, `MediaAsset`, `Domain`.

### Infrastructure
Repositorios Supabase, Auth, Storage, DNS/hosting, analytics.

## Render público
```text
Host
 -> normalize host
 -> resolve site
 -> load active publication
 -> resolve active campaign by date/priority
 -> compose theme layers
 -> render template registry
```

## Theme composition
```text
Global Design System
      + Template Direction
      + Brand Theme
      + Active Campaign Overrides
      + Safe Section Overrides
      = Final Render Model
```

## Draft / Published
El admin edita draft. `PublishSite` genera un snapshot inmutable. La landing pública consume solo el snapshot activo.

## Regla de dependencias
`UI -> Application -> Domain`; Infrastructure implementa contratos. Componentes no hacen queries arbitrarias.
