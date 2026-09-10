import type { APIRoute } from "astro";
// Liveness only: does not claim that Supabase or migrations are healthy.
export const GET: APIRoute = () => Response.json({ status: "ok" });
