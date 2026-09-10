import type { TenantSubscription } from "../../domain/saas/subscription";

export interface TenantResourceCounts {
  readonly sites: number;
  readonly customDomains: number;
  readonly campaigns: number;
  readonly mediaAssets: number;
}

export interface SubscriptionRepository {
  getSubscription(tenantId: string): Promise<TenantSubscription | null>;
  saveSubscription(subscription: TenantSubscription): Promise<void>;
  listAllSubscriptions(): Promise<TenantSubscription[]>;
  countTenantResources(tenantId: string): Promise<TenantResourceCounts>;
  isPlatformSuperadmin(userId: string): Promise<boolean>;
}
