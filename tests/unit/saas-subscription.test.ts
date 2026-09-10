import { describe, expect, it } from "vitest";
import {
  calculateTrialDaysRemaining,
  createDefaultTrialSubscription,
  isSubscriptionOperational,
  isTrialActive,
} from "../../src/domain/saas/subscription";

describe("SaaS Subscription & Trial Lifecycle", () => {
  it("creates a default 14-day trial of the pro plan", () => {
    const fixedNow = new Date("2026-09-10T12:00:00Z");
    const sub = createDefaultTrialSubscription("tenant-123", { trialDays: 14, now: fixedNow });

    expect(sub.tenantId).toBe("tenant-123");
    expect(sub.planId).toBe("pro");
    expect(sub.status).toBe("trialing");
    expect(sub.trialEndsAt).toBe("2026-09-24T12:00:00.000Z");
    expect(isTrialActive(sub, fixedNow)).toBe(true);
    expect(calculateTrialDaysRemaining(sub, fixedNow)).toBe(14);
    expect(isSubscriptionOperational(sub, fixedNow)).toBe(true);
  });

  it("handles trial expiration accurately", () => {
    const start = new Date("2026-09-01T12:00:00Z");
    const sub = createDefaultTrialSubscription("tenant-123", { trialDays: 7, now: start });

    const beforeExpiry = new Date("2026-09-07T12:00:00Z");
    expect(isTrialActive(sub, beforeExpiry)).toBe(true);
    expect(calculateTrialDaysRemaining(sub, beforeExpiry)).toBe(1);

    const afterExpiry = new Date("2026-09-09T12:00:00Z");
    expect(isTrialActive(sub, afterExpiry)).toBe(false);
    expect(calculateTrialDaysRemaining(sub, afterExpiry)).toBe(0);
    expect(isSubscriptionOperational(sub, afterExpiry)).toBe(false);
  });

  it("identifies active paid subscriptions as operational regardless of trial date", () => {
    const sub = {
      ...createDefaultTrialSubscription("tenant-123"),
      status: "active" as const,
      trialEndsAt: "2020-01-01T00:00:00Z",
    };

    expect(isSubscriptionOperational(sub)).toBe(true);
  });
});
