import type { APIRoute } from "astro";
import { trackAnalyticsEventUseCase } from "../../application/analytics/track-event";
import { SupabaseAnalyticsRepository } from "../../infrastructure/supabase/analytics-repository";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    const analyticsRepo = new SupabaseAnalyticsRepository(locals.supabase);

    const userAgent = request.headers.get("user-agent") || undefined;
    const referrer = request.headers.get("referer") || body.referrer || undefined;

    await trackAnalyticsEventUseCase(
      {
        siteId: body.siteId,
        tenantId: body.tenantId,
        eventName: body.eventName,
        path: body.path || "/",
        referrer,
        userAgent,
        metadata: body.metadata,
      },
      analyticsRepo
    );

    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message || "Failed to record event" }), {
      status: 400,
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
};

export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
