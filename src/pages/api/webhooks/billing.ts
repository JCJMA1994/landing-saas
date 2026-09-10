import type { APIRoute } from "astro";
import { verifyWebhookSignature } from "../../../domain/scale/webhook";
import { SupabaseSubscriptionRepository } from "../../../infrastructure/supabase/subscription-repository";
import { parseServerEnv } from "../../../infrastructure/config/env";
import { createRequestClient } from "../../../infrastructure/supabase/server";

export const POST: APIRoute = async ({ request, cookies }) => {
  const env = parseServerEnv({ ...import.meta.env, ...process.env });
  const webhookSecret = process.env.BILLING_WEBHOOK_SECRET || "whsec_default_billing_secret_123456";

  const rawBody = await request.text();
  const signatureHeader = request.headers.get("X-SaaS-Signature") || request.headers.get("x-saas-signature");

  const isValid = verifyWebhookSignature(rawBody, signatureHeader, webhookSecret);
  if (!isValid) {
    return new Response(JSON.stringify({ error: "Invalid webhook signature" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  let eventData: any;
  try {
    eventData = JSON.parse(rawBody);
  } catch {
    return new Response(JSON.stringify({ error: "Malformed JSON payload" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createRequestClient(request, cookies, env);
  const subRepo = new SupabaseSubscriptionRepository(supabase);

  const { event, data } = eventData;
  if (data?.tenantId) {
    const existing = await subRepo.getSubscription(data.tenantId);
    if (existing) {
      if (event === "subscription.updated" || event === "invoice.payment_succeeded") {
        await subRepo.saveSubscription({
          ...existing,
          planId: data.planId || existing.planId,
          status: data.status || "active",
          currentPeriodEndsAt: data.currentPeriodEndsAt || existing.currentPeriodEndsAt,
          updatedAt: new Date().toISOString(),
        });
      } else if (event === "invoice.payment_failed") {
        await subRepo.saveSubscription({
          ...existing,
          status: "past_due",
          updatedAt: new Date().toISOString(),
        });
      }
    }
  }

  return new Response(JSON.stringify({ received: true, event }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
