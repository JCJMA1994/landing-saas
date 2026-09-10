import { describe, expect, it } from "vitest";
import { PLANS } from "../../src/domain/saas/plan";
import {
  assertQuotaNotExceeded,
  evaluateQuota,
  QuotaExceededError,
} from "../../src/domain/saas/quota";

describe("SaaS Quota Evaluation", () => {
  const starter = PLANS.starter;
  const pro = PLANS.pro;

  it("evaluates usage correctly within plan limits", () => {
    const status = evaluateQuota(starter, "sites", 0);
    expect(status.allowed).toBe(true);
    expect(status.remaining).toBe(1);
    expect(status.usagePercentage).toBe(0);
    expect(() => assertQuotaNotExceeded(starter, "sites", 0)).not.toThrow();
  });

  it("detects and raises QuotaExceededError when limit reached or exceeded", () => {
    const status = evaluateQuota(starter, "sites", 1);
    expect(status.allowed).toBe(false);
    expect(status.remaining).toBe(0);
    expect(status.usagePercentage).toBe(100);

    expect(() => assertQuotaNotExceeded(starter, "sites", 1)).toThrow(QuotaExceededError);
    expect(() => assertQuotaNotExceeded(starter, "custom_domains", 0)).toThrow(
      QuotaExceededError
    );
  });

  it("calculates partial usage percentages cleanly", () => {
    // Pro allows 5 sites. With 2 sites: 40%
    const status = evaluateQuota(pro, "sites", 2);
    expect(status.allowed).toBe(true);
    expect(status.remaining).toBe(3);
    expect(status.usagePercentage).toBe(40);
  });
});
