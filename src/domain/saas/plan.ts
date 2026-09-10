export const PLAN_IDS = ["starter", "pro", "agency"] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value);
}

export interface PlanLimits {
  readonly maxSites: number;
  readonly maxCustomDomains: number;
  readonly maxActiveCampaigns: number;
  readonly maxMonthlyEvents: number;
  readonly maxMediaAssets: number;
}

export interface PlanFeatureFlags {
  readonly customDomains: boolean;
  readonly campaigns: boolean;
  readonly advancedAnalytics: boolean;
  readonly removeBranding: boolean;
  readonly prioritySupport: boolean;
}

export interface PlanManifest {
  readonly id: PlanId;
  readonly name: string;
  readonly tagline: string;
  readonly priceMonthlyUsd: number;
  readonly limits: PlanLimits;
  readonly features: PlanFeatureFlags;
}

export const PLANS: Record<PlanId, PlanManifest> = {
  starter: {
    id: "starter",
    name: "Starter",
    tagline: "Essential tools to launch your first high-converting landing page.",
    priceMonthlyUsd: 0,
    limits: {
      maxSites: 1,
      maxCustomDomains: 0,
      maxActiveCampaigns: 1,
      maxMonthlyEvents: 10_000,
      maxMediaAssets: 5,
    },
    features: {
      customDomains: false,
      campaigns: false,
      advancedAnalytics: false,
      removeBranding: false,
      prioritySupport: false,
    },
  },
  pro: {
    id: "pro",
    name: "Pro",
    tagline: "For growing businesses and professional service providers.",
    priceMonthlyUsd: 29,
    limits: {
      maxSites: 5,
      maxCustomDomains: 3,
      maxActiveCampaigns: 5,
      maxMonthlyEvents: 250_000,
      maxMediaAssets: 50,
    },
    features: {
      customDomains: true,
      campaigns: true,
      advancedAnalytics: true,
      removeBranding: true,
      prioritySupport: false,
    },
  },
  agency: {
    id: "agency",
    name: "Agency",
    tagline: "High-volume multi-client scale with dedicated performance and priority support.",
    priceMonthlyUsd: 99,
    limits: {
      maxSites: 25,
      maxCustomDomains: 20,
      maxActiveCampaigns: 50,
      maxMonthlyEvents: 2_000_000,
      maxMediaAssets: 500,
    },
    features: {
      customDomains: true,
      campaigns: true,
      advancedAnalytics: true,
      removeBranding: true,
      prioritySupport: true,
    },
  },
};

export function getPlanManifest(id: PlanId): PlanManifest {
  const plan = PLANS[id];
  if (!plan) {
    throw new Error(`Unrecognized plan ID: "${id}"`);
  }
  return plan;
}
