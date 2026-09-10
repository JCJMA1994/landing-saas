import type { PlanFeatureFlags, PlanManifest } from "./plan";

export type FeatureFlagKey = keyof PlanFeatureFlags;

export class FeatureNotAllowedError extends Error {
  readonly feature: FeatureFlagKey;
  readonly planId: string;

  constructor(feature: FeatureFlagKey, planId: string) {
    super(
      `Feature "${feature}" is not available on the "${planId}" plan. Please upgrade your subscription to access this capability.`
    );
    this.name = "FeatureNotAllowedError";
    this.feature = feature;
    this.planId = planId;
  }
}

export function isFeatureEnabled(plan: PlanManifest, feature: FeatureFlagKey): boolean {
  return Boolean(plan.features[feature]);
}

export function assertFeatureEnabled(plan: PlanManifest, feature: FeatureFlagKey): void {
  if (!isFeatureEnabled(plan, feature)) {
    throw new FeatureNotAllowedError(feature, plan.id);
  }
}
