import type {
  BillingGateway,
  CheckoutSessionResult,
  CustomerPortalResult,
} from "../../application/saas/billing-gateway";
import type { PlanId } from "../../domain/saas/plan";

export class MockBillingGateway implements BillingGateway {
  async createCheckoutSession(
    tenantId: string,
    planId: PlanId,
    returnUrl: string
  ): Promise<CheckoutSessionResult> {
    const sessionId = `cs_mock_${tenantId.slice(0, 8)}_${planId}_${Date.now()}`;
    const checkoutUrl = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}session_id=${sessionId}&plan=${planId}&success=true`;

    return {
      sessionId,
      checkoutUrl,
    };
  }

  async createCustomerPortalSession(
    tenantId: string,
    returnUrl: string
  ): Promise<CustomerPortalResult> {
    const portalUrl = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}portal=mock&tenant=${tenantId}`;
    return {
      portalUrl,
    };
  }
}
