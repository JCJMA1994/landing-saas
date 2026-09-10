# ADR 0001: Phase-zero architecture

Status: Accepted.

Use Astro SSR with the official standalone Node adapter, strict TypeScript,
Node 24, pnpm and a committed lockfile. Middleware is the composition root.
Host validation remains domain logic; Supabase and cookies remain infrastructure.
A fresh Supabase client is created per request, and identity is verified with
`auth.getUser` rather than trusted from `getSession().user`.

The portable Node adapter avoids prematurely selecting a hosting vendor, at
the cost of operating a Node process and trusted TLS/reverse-proxy boundary.
No React integration is installed because the foundation page is not interactive.
