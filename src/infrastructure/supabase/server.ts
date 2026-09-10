import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { AstroCookies } from "astro";
import type { ServerEnv } from "../config/env";

// A new client for each request prevents sessions leaking between visitors.
export function createRequestClient(request: Request, cookies: AstroCookies, env: ServerEnv) {
  return createServerClient(env.supabaseUrl, env.supabaseKey, { cookies: {
    getAll: () => parseCookieHeader(request.headers.get("cookie") ?? "").map(({ name, value }) => ({ name, value: value ?? "" })),
    setAll: (values) => { for (const { name, value, options } of values) cookies.set(name, value, { ...options, path: "/", secure: env.appEnv !== "development", sameSite: "lax" }); },
  } });
}

// Service-role client for internal operations (health checks, webhooks, migrations).
// NEVER expose this client to the browser or pass it through locals.
export function createAdminClient(env: ServerEnv) {
  const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!serviceKey) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(env.supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
