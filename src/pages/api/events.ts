import type { APIRoute } from "astro";
import { trackAnalyticsEventUseCase } from "../../application/analytics/track-event";
import { SupabaseAnalyticsRepository } from "../../infrastructure/supabase/analytics-repository";

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const body = await request.json();
    if (!body?.siteId) {
      return new Response(JSON.stringify({ error: "siteId is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Resolve tenant_id securely from the database (never trust client input)
    let tenantId = body.tenantId;
    if (!tenantId) {
      const { data: siteRow, error: siteErr } = await locals.supabase
        .from("sites")
        .select("id, tenant_id")
        .eq("id", body.siteId)
        .maybeSingle();

      if (siteErr || !siteRow) {
        return new Response(JSON.stringify({ error: "Site not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      tenantId = siteRow.tenant_id;
    }

    const analyticsRepo = new SupabaseAnalyticsRepository(locals.supabase);

    const userAgent = request.headers.get("user-agent") || undefined;
    const referrer = request.headers.get("referer") || body.referrer || undefined;

    await trackAnalyticsEventUseCase(
      {
        siteId: body.siteId,
        tenantId,
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
