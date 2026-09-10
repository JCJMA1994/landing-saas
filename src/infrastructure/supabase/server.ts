import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import type { AstroCookies } from "astro";
import type { ServerEnv } from "../config/env";

// A new client for each request prevents sessions leaking between visitors.
export function createRequestClient(request: Request, cookies: AstroCookies, env: ServerEnv) {
  return createServerClient(env.supabaseUrl, env.supabaseKey, { cookies: {
    getAll: () => parseCookieHeader(request.headers.get("cookie") ?? "").map(({ name, value }) => ({ name, value: value ?? "" })),
    setAll: (values) => { for (const { name, value, options } of values) cookies.set(name, value, { ...options, path: "/", secure: env.appEnv !== "development", sameSite: "lax" }); },
  } });
}
