import { randomUUID } from "node:crypto";
import { defineMiddleware } from "astro:middleware";
import { classifyHost, classifyRoutingHost } from "./domain/tenant/host";
import { parseServerEnv } from "./infrastructure/config/env";
import { createRequestClient } from "./infrastructure/supabase/server";
import { decideAdminAccess } from "./application/auth/admin-access";

export const onRequest = defineMiddleware(async (context, next) => {
  const startTime = performance.now();
  context.locals.requestId = randomUUID();

  const finish = (response: Response) => {
    const durationMs = Math.round(performance.now() - startTime);
    response.headers.set("X-Request-Id", context.locals.requestId);
    response.headers.set("X-Content-Type-Options", "nosniff");
    response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    if (!response.headers.has("Cache-Control")) {
      response.headers.set("Cache-Control", "private, no-store");
    }
    response.headers.set("Server-Timing", `total;dur=${durationMs}`);
    return response;
  };

  try {
    const env = parseServerEnv(import.meta.env, process.env);
    const rawHost = context.request.headers.get("host");

    context.locals.hostContext = classifyHost(rawHost, env.appHostname);
    context.locals.hostRouting = classifyRoutingHost(rawHost, env.appHostname);

    // If host is completely unknown/invalid, fail closed
    if (context.locals.hostRouting.kind === "unknown") {
      return finish(new Response("Unknown host", { status: 421 }));
    }

    // Admin endpoints are strictly isolated to the platform domain
    if (context.url.pathname.startsWith("/admin") && context.locals.hostRouting.kind !== "platform") {
      return finish(new Response("Not found", { status: 404 }));
    }

    context.locals.supabase = createRequestClient(context.request, context.cookies, env);
    context.locals.user = null;

    if (context.request.headers.has("cookie")) {
      const { data, error } = await context.locals.supabase.auth.getUser();
      context.locals.user = error ? null : data.user;
    }

    if (decideAdminAccess(context.url.pathname, context.locals.user) === "redirect-login") {
      return finish(context.redirect("/admin/login", 303));
    }

    return finish(await next());
  } catch (err: any) {
    console.error(
      JSON.stringify({
        event: "request.failed",
        requestId: context.locals.requestId,
        path: context.url.pathname,
        error: err?.message || String(err),
      })
    );
    return finish(new Response("Service unavailable", { status: 503 }));
  }
});
