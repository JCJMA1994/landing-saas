import { describe, expect, it } from "vitest";
import { getPlanManifest, isPlanId } from "../../src/domain/saas/plan";

describe("SaaS Plan Manifests & Limits", () => {
  it("defines starter, pro, and agency plans with valid hierarchies", () => {
    expect(isPlanId("starter")).toBe(true);
    expect(isPlanId("pro")).toBe(true);
    expect(isPlanId("agency")).toBe(true);
    expect(isPlanId("invalid")).toBe(false);

    const starter = getPlanManifest("starter");
    const pro = getPlanManifest("pro");
    const agency = getPlanManifest("agency");

    // Price progression
    expect(starter.priceMonthlyUsd).toBe(0);
    expect(pro.priceMonthlyUsd).toBe(29);
    expect(agency.priceMonthlyUsd).toBe(99);

    // Quota limits progression
    expect(starter.limits.maxSites).toBeLessThan(pro.limits.maxSites);
    expect(pro.limits.maxSites).toBeLessThan(agency.limits.maxSites);

    expect(starter.limits.maxCustomDomains).toBe(0);
    expect(pro.limits.maxCustomDomains).toBe(3);
    expect(agency.limits.maxCustomDomains).toBe(20);

    // Feature flag progression
    expect(starter.features.customDomains).toBe(false);
    expect(pro.features.customDomains).toBe(true);
    expect(starter.features.campaigns).toBe(false);
    expect(pro.features.campaigns).toBe(true);
    expect(pro.features.prioritySupport).toBe(false);
    expect(agency.features.prioritySupport).toBe(true);
  });

  it("throws error for unrecognized plan ID", () => {
    expect(() => getPlanManifest("unknown" as any)).toThrow(/Unrecognized plan ID/);
  });
});
