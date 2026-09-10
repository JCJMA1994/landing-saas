import type { PlanId } from "../../domain/saas/plan";

export interface CheckoutSessionResult {
  readonly checkoutUrl: string;
  readonly sessionId: string;
}

export interface CustomerPortalResult {
  readonly portalUrl: string;
}

export interface BillingGateway {
  createCheckoutSession(
    tenantId: string,
    planId: PlanId,
    returnUrl: string
  ): Promise<CheckoutSessionResult>;
  createCustomerPortalSession(tenantId: string, returnUrl: string): Promise<CustomerPortalResult>;
}
