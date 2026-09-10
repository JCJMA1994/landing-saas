import {
  getPlanManifest,
  isPlanId,
  PLANS,
  type PlanId,
  type PlanManifest,
} from "../../domain/saas/plan";
import {
  assertQuotaNotExceeded,
  evaluateQuota,
  type QuotaResource,
  type QuotaStatus,
} from "../../domain/saas/quota";
import {
  assertFeatureEnabled,
  isFeatureEnabled,
  type FeatureFlagKey,
} from "../../domain/saas/feature-flag";
import {
  createDefaultTrialSubscription,
  type TenantSubscription,
} from "../../domain/saas/subscription";
import type { SubscriptionRepository, TenantResourceCounts } from "./subscription-repository";
import type { AuditLogGateway } from "../audit/audit-gateway";
import type { TenantRole } from "../../domain/tenant/roles";

export class SubscriptionAuthorizationError extends Error {
  constructor(message = "Not authorized to manage tenant subscription.") {
    super(message);
    this.name = "SubscriptionAuthorizationError";
  }
}

export class InvalidPlanError extends Error {
  constructor(planId: string) {
    super(`Invalid plan requested: "${planId}". Valid plans are: ${Object.keys(PLANS).join(", ")}.`);
    this.name = "InvalidPlanError";
  }
}

export async function getTenantSubscriptionUseCase(
  tenantId: string,
  repository: SubscriptionRepository
): Promise<TenantSubscription> {
  const existing = await repository.getSubscription(tenantId);
  if (existing) {
    return existing;
  }

  // Auto-initialize default 14-day trial of Pro plan
  const defaultSub = createDefaultTrialSubscription(tenantId);
  await repository.saveSubscription(defaultSub);
  return defaultSub;
}

export interface ChangePlanInput {
  tenantId: string;
  newPlanId: PlanId;
  actorUserId: string;
  actorRole: TenantRole;
  isSuperadmin?: boolean | undefined;
  repository: SubscriptionRepository;
  auditGateway: AuditLogGateway;
}

export async function changeTenantPlanUseCase(
  input: ChangePlanInput
): Promise<TenantSubscription> {
  const { tenantId, newPlanId, actorUserId, actorRole, isSuperadmin, repository, auditGateway } = input;

  if (actorRole !== "owner" && !isSuperadmin) {
    throw new SubscriptionAuthorizationError("Only tenant owners or platform superadmins can modify subscription plans.");
  }

  if (!isPlanId(newPlanId)) {
    throw new InvalidPlanError(String(newPlanId));
  }

  const current = await getTenantSubscriptionUseCase(tenantId, repository);
  const updated: TenantSubscription = {
    ...current,
    planId: newPlanId,
    status: newPlanId === "starter" ? "active" : "active",
    updatedAt: new Date().toISOString(),
  };

  await repository.saveSubscription(updated);

  await auditGateway.record({
    tenantId,
    actorUserId,
    action: "subscription.plan_changed",
    resourceType: "subscription",
    resourceId: updated.id,
    metadata: {
      previousPlan: current.planId,
      newPlan: newPlanId,
    },
  });

  return updated;
}

export interface EnforceQuotaInput {
  tenantId: string;
  resource: QuotaResource;
  repository: SubscriptionRepository;
}

export async function enforceTenantQuotaUseCase(
  input: EnforceQuotaInput
): Promise<QuotaStatus> {
  const { tenantId, resource, repository } = input;
  const subscription = await getTenantSubscriptionUseCase(tenantId, repository);
  const plan = getPlanManifest(subscription.planId);
  const counts = await repository.countTenantResources(tenantId);

  let currentCount = 0;
  switch (resource) {
    case "sites":
      currentCount = counts.sites;
      break;
    case "custom_domains":
      currentCount = counts.customDomains;
      break;
    case "campaigns":
      currentCount = counts.campaigns;
      break;
    case "media_assets":
      currentCount = counts.mediaAssets;
      break;
    case "monthly_events":
      currentCount = 0; // Handled incrementally
      break;
  }

  assertQuotaNotExceeded(plan, resource, currentCount);
  return evaluateQuota(plan, resource, currentCount);
}

export interface CheckFeatureInput {
  tenantId: string;
  feature: FeatureFlagKey;
  repository: SubscriptionRepository;
}

export async function checkTenantFeatureFlagUseCase(
  input: CheckFeatureInput
): Promise<boolean> {
  const { tenantId, feature, repository } = input;
  const subscription = await getTenantSubscriptionUseCase(tenantId, repository);
  const plan = getPlanManifest(subscription.planId);
  assertFeatureEnabled(plan, feature);
  return true;
}

export interface TenantUsageOverview {
  subscription: TenantSubscription;
  plan: PlanManifest;
  counts: TenantResourceCounts;
  quotas: Record<QuotaResource, QuotaStatus>;
  features: Record<FeatureFlagKey, boolean>;
}

export async function getTenantUsageOverviewUseCase(
  tenantId: string,
  repository: SubscriptionRepository
): Promise<TenantUsageOverview> {
  const subscription = await getTenantSubscriptionUseCase(tenantId, repository);
  const plan = getPlanManifest(subscription.planId);
  const counts = await repository.countTenantResources(tenantId);

  const quotas: Record<QuotaResource, QuotaStatus> = {
    sites: evaluateQuota(plan, "sites", counts.sites),
    custom_domains: evaluateQuota(plan, "custom_domains", counts.customDomains),
    campaigns: evaluateQuota(plan, "campaigns", counts.campaigns),
    media_assets: evaluateQuota(plan, "media_assets", counts.mediaAssets),
    monthly_events: evaluateQuota(plan, "monthly_events", 0),
  };

  const features: Record<FeatureFlagKey, boolean> = {
    customDomains: isFeatureEnabled(plan, "customDomains"),
    campaigns: isFeatureEnabled(plan, "campaigns"),
    advancedAnalytics: isFeatureEnabled(plan, "advancedAnalytics"),
    removeBranding: isFeatureEnabled(plan, "removeBranding"),
    prioritySupport: isFeatureEnabled(plan, "prioritySupport"),
  };

  return {
    subscription,
    plan,
    counts,
    quotas,
    features,
  };
}

export interface PlatformBackofficeOverview {
  totalTenants: number;
  activeSubscriptions: number;
  trialingSubscriptions: number;
  estimatedMonthlyRecurringRevenueUsd: number;
  allSubscriptions: TenantSubscription[];
}

export async function getPlatformBackofficeOverviewUseCase(
  isSuperadmin: boolean,
  repository: SubscriptionRepository
): Promise<PlatformBackofficeOverview> {
  if (!isSuperadmin) {
    throw new SubscriptionAuthorizationError("Access denied: platform superadmin privileges required.");
  }

  const subscriptions = await repository.listAllSubscriptions();
  const totalTenants = subscriptions.length;
  const activeSubscriptions = subscriptions.filter((s) => s.status === "active").length;
  const trialingSubscriptions = subscriptions.filter((s) => s.status === "trialing").length;

  const estimatedMonthlyRecurringRevenueUsd = subscriptions.reduce((acc, sub) => {
    if (sub.status === "active") {
      const plan = PLANS[sub.planId];
      return acc + (plan?.priceMonthlyUsd || 0);
    }
    return acc;
  }, 0);

  return {
    totalTenants,
    activeSubscriptions,
    trialingSubscriptions,
    estimatedMonthlyRecurringRevenueUsd,
    allSubscriptions: subscriptions,
  };
}
