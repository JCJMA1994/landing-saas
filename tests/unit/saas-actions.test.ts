import { describe, expect, it } from "vitest";
import { MockBillingGateway } from "../../src/infrastructure/billing/mock-billing-gateway";
import { PLANS } from "../../src/domain/saas/plan";
import { evaluateQuota } from "../../src/domain/saas/quota";

describe("SaaS Actions & Billing Workflows", () => {
  it("generates checkout session urls with parameters", async () => {
    const gateway = new MockBillingGateway();
    const session = await gateway.createCheckoutSession(
      "tenant-abc-123",
      "pro",
      "https://example.com/admin/billing"
    );

    expect(session.sessionId).toContain("cs_mock_tenant-a_pro_");
    expect(session.checkoutUrl).toContain("session_id=");
    expect(session.checkoutUrl).toContain("plan=pro");
    expect(session.checkoutUrl).toContain("success=true");
  });

  it("generates customer portal session urls", async () => {
    const gateway = new MockBillingGateway();
    const portal = await gateway.createCustomerPortalSession(
      "tenant-abc-123",
      "https://example.com/admin/billing"
    );

    expect(portal.portalUrl).toContain("portal=mock");
    expect(portal.portalUrl).toContain("tenant=tenant-abc-123");
  });

  it("calculates resource quota headroom for upgrade prompts", () => {
    const starterPlan = PLANS.starter;
    const proPlan = PLANS.pro;

    const sitesOnStarter = evaluateQuota(starterPlan, "sites", 1);
    expect(sitesOnStarter.allowed).toBe(false);

    // After upgrading to Pro
    const sitesOnPro = evaluateQuota(proPlan, "sites", 1);
    expect(sitesOnPro.allowed).toBe(true);
    expect(sitesOnPro.remaining).toBe(4);
  });
});
