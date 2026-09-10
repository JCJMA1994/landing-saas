import type { PlanLimits, PlanManifest } from "./plan";

export type QuotaResource =
  | "sites"
  | "custom_domains"
  | "campaigns"
  | "media_assets"
  | "monthly_events";

export interface QuotaStatus {
  readonly resource: QuotaResource;
  readonly current: number;
  readonly limit: number;
  readonly allowed: boolean;
  readonly remaining: number;
  readonly usagePercentage: number;
}

export class QuotaExceededError extends Error {
  readonly resource: QuotaResource;
  readonly current: number;
  readonly limit: number;

  constructor(resource: QuotaResource, current: number, limit: number) {
    super(
      `Quota limit exceeded for resource "${resource}". Current usage is ${current}, limit is ${limit}. Please upgrade your plan to increase limits.`
    );
    this.name = "QuotaExceededError";
    this.resource = resource;
    this.current = current;
    this.limit = limit;
  }
}

export function getLimitForResource(limits: PlanLimits, resource: QuotaResource): number {
  switch (resource) {
    case "sites":
      return limits.maxSites;
    case "custom_domains":
      return limits.maxCustomDomains;
    case "campaigns":
      return limits.maxActiveCampaigns;
    case "media_assets":
      return limits.maxMediaAssets;
    case "monthly_events":
      return limits.maxMonthlyEvents;
  }
}

export function evaluateQuota(
  plan: PlanManifest,
  resource: QuotaResource,
  currentUsage: number
): QuotaStatus {
  const limit = getLimitForResource(plan.limits, resource);
  const remaining = Math.max(0, limit - currentUsage);
  const usagePercentage = limit > 0 ? Math.min(100, Math.round((currentUsage / limit) * 100)) : 100;
  const allowed = currentUsage < limit;

  return {
    resource,
    current: currentUsage,
    limit,
    allowed,
    remaining,
    usagePercentage,
  };
}

export function assertQuotaNotExceeded(
  plan: PlanManifest,
  resource: QuotaResource,
  currentUsage: number
): void {
  const status = evaluateQuota(plan, resource, currentUsage);
  if (!status.allowed) {
    throw new QuotaExceededError(resource, currentUsage, status.limit);
  }
}
