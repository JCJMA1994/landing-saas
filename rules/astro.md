# Astro Rules
- Astro primero, React solo para interacción compleja.
- SSR/on-demand para contenido administrable.
- Actions/endpoints server-side para mutaciones.
- Middleware resuelve request id, user, tenant/site.
- No compartir cliente Supabase autenticado entre requests.
- Public landing independiente del bundle admin.
- Campaign resolution server-side y determinista.
