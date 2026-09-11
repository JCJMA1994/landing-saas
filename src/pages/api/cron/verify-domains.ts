import type { APIRoute } from "astro";
import { parseServerEnv } from "../../../infrastructure/config/env";
import { createAdminClient } from "../../../infrastructure/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { SupabaseDomainRepository } from "../../../infrastructure/supabase/domain-repository";
import { NodeDnsGateway } from "../../../infrastructure/dns/node-dns-gateway";
import { SupabaseAuditGateway } from "../../../infrastructure/supabase/audit-gateway";
import { verifyPendingDomainsUseCase } from "../../../application/domain/manage-domains";

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  const env = parseServerEnv(import.meta.env, process.env);
  const cronSecret = process.env.CRON_SECRET;

  // Protect the endpoint in production or when CRON_SECRET is configured
  if (cronSecret || env.appEnv === "production") {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  try {
    // Prefer service-role client for background system worker; fallback to public key in dev if not set
    const supabase = process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient(env)
      : createClient(env.supabaseUrl, env.supabaseKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

    const domainRepo = new SupabaseDomainRepository(supabase);
    const dnsGateway = new NodeDnsGateway();
    const auditGateway = new SupabaseAuditGateway(supabase);
    const cnameTarget = `cname.${env.appHostname}`;

    const summary = await verifyPendingDomainsUseCase(
      cnameTarget,
      domainRepo,
      dnsGateway,
      auditGateway,
      50
    );

    return new Response(
      JSON.stringify({
        ok: true,
        timestamp: new Date().toISOString(),
        summary,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store, no-cache, must-revalidate",
        },
      }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        ok: false,
        error: error?.message || "Internal server error during domain verification cron.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
