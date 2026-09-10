import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  SubscriptionRepository,
  TenantResourceCounts,
} from "../../application/saas/subscription-repository";
import type {
  SubscriptionStatus,
  TenantSubscription,
} from "../../domain/saas/subscription";
import type { PlanId } from "../../domain/saas/plan";

interface DbSubscriptionRow {
  id: string;
  tenant_id: string;
  plan_id: string;
  status: string;
  trial_ends_at: string | null;
  current_period_starts_at: string;
  current_period_ends_at: string;
  cancel_at_period_end: boolean;
  billing_customer_id: string | null;
  billing_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

function mapSubscription(row: DbSubscriptionRow): TenantSubscription {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    planId: row.plan_id as PlanId,
    status: row.status as SubscriptionStatus,
    trialEndsAt: row.trial_ends_at || undefined,
    currentPeriodStartsAt: row.current_period_starts_at,
    currentPeriodEndsAt: row.current_period_ends_at,
    cancelAtPeriodEnd: row.cancel_at_period_end,
    billingCustomerId: row.billing_customer_id || undefined,
    billingSubscriptionId: row.billing_subscription_id || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseSubscriptionRepository implements SubscriptionRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async getSubscription(tenantId: string): Promise<TenantSubscription | null> {
    const { data, error } = await this.supabase
      .from("tenant_subscriptions")
      .select("*")
      .eq("tenant_id", tenantId)
      .maybeSingle();

    if (error) {
      // In development or when table hasn't been migrated yet, degrade gracefully
      return null;
    }

    return data ? mapSubscription(data as DbSubscriptionRow) : null;
  }

  async saveSubscription(subscription: TenantSubscription): Promise<void> {
    const payload = {
      id: subscription.id,
      tenant_id: subscription.tenantId,
      plan_id: subscription.planId,
      status: subscription.status,
      trial_ends_at: subscription.trialEndsAt || null,
      current_period_starts_at: subscription.currentPeriodStartsAt,
      current_period_ends_at: subscription.currentPeriodEndsAt,
      cancel_at_period_end: subscription.cancelAtPeriodEnd,
      billing_customer_id: subscription.billingCustomerId || null,
      billing_subscription_id: subscription.billingSubscriptionId || null,
      updated_at: new Date().toISOString(),
    };

    const { error } = await this.supabase
      .from("tenant_subscriptions")
      .upsert(payload, { onConflict: "tenant_id" });

    if (error) {
      throw new Error(`Failed to save tenant subscription: ${error.message}`);
    }
  }

  async listAllSubscriptions(): Promise<TenantSubscription[]> {
    const { data, error } = await this.supabase
      .from("tenant_subscriptions")
      .select("*")
      .order("created_at", { ascending: false });

    if (error || !Array.isArray(data)) {
      return [];
    }

    return (data as DbSubscriptionRow[]).map(mapSubscription);
  }

  async countTenantResources(tenantId: string): Promise<TenantResourceCounts> {
    const [sitesRes, domainsRes, campaignsRes, mediaRes] = await Promise.all([
      this.supabase
        .from("sites")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      this.supabase
        .from("site_domains")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      this.supabase
        .from("site_campaigns")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
      this.supabase
        .from("site_media_assets")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId),
    ]);

    return {
      sites: sitesRes.count ?? 0,
      customDomains: domainsRes.count ?? 0,
      campaigns: campaignsRes.count ?? 0,
      mediaAssets: mediaRes.count ?? 0,
    };
  }

  async isPlatformSuperadmin(userId: string): Promise<boolean> {
    if (!userId) return false;
    const { data, error } = await this.supabase
      .from("platform_superadmins")
      .select("user_id")
      .eq("user_id", userId)
      .maybeSingle();

    return !error && Boolean(data?.user_id);
  }
}
