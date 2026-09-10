import type { PlanId } from "./plan";

export const SUBSCRIPTION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "canceled",
  "incomplete",
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface TenantSubscription {
  readonly id: string;
  readonly tenantId: string;
  readonly planId: PlanId;
  readonly status: SubscriptionStatus;
  readonly trialEndsAt?: string | undefined;
  readonly currentPeriodStartsAt: string;
  readonly currentPeriodEndsAt: string;
  readonly cancelAtPeriodEnd: boolean;
  readonly billingCustomerId?: string | undefined;
  readonly billingSubscriptionId?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function isTrialActive(subscription: TenantSubscription, now = new Date()): boolean {
  if (subscription.status !== "trialing") return false;
  if (!subscription.trialEndsAt) return false;
  return new Date(subscription.trialEndsAt).getTime() > now.getTime();
}

export function calculateTrialDaysRemaining(
  subscription: TenantSubscription,
  now = new Date()
): number {
  if (!subscription.trialEndsAt) return 0;
  const diffMs = new Date(subscription.trialEndsAt).getTime() - now.getTime();
  if (diffMs <= 0) return 0;
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isSubscriptionOperational(
  subscription: TenantSubscription,
  now = new Date()
): boolean {
  if (subscription.status === "active") return true;
  if (subscription.status === "trialing") {
    return isTrialActive(subscription, now);
  }
  return false;
}

export function createDefaultTrialSubscription(
  tenantId: string,
  options?: { trialDays?: number; now?: Date }
): TenantSubscription {
  const trialDays = options?.trialDays ?? 14;
  const now = options?.now ?? new Date();
  const trialEnds = new Date(now.getTime() + trialDays * 24 * 60 * 60 * 1000);
  const periodEnds = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  return {
    id: `sub-${tenantId.slice(0, 8)}`,
    tenantId,
    planId: "pro", // Default to 14-day trial of Pro tier
    status: "trialing",
    trialEndsAt: trialEnds.toISOString(),
    currentPeriodStartsAt: now.toISOString(),
    currentPeriodEndsAt: periodEnds.toISOString(),
    cancelAtPeriodEnd: false,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}
