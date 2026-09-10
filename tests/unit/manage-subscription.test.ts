import { describe, expect, it, vi } from "vitest";
import {
  changeTenantPlanUseCase,
  checkTenantFeatureFlagUseCase,
  enforceTenantQuotaUseCase,
  getPlatformBackofficeOverviewUseCase,
  getTenantSubscriptionUseCase,
  getTenantUsageOverviewUseCase,
  InvalidPlanError,
  SubscriptionAuthorizationError,
} from "../../src/application/saas/manage-subscription";
import type {
  SubscriptionRepository,
  TenantResourceCounts,
} from "../../src/application/saas/subscription-repository";
import type { TenantSubscription } from "../../src/domain/saas/subscription";
import type { AuditLogGateway } from "../../src/application/audit/audit-gateway";
import { QuotaExceededError } from "../../src/domain/saas/quota";
import { FeatureNotAllowedError } from "../../src/domain/saas/feature-flag";

class InMemorySubscriptionRepository implements SubscriptionRepository {
  public subs: Map<string, TenantSubscription> = new Map();
  public counts: TenantResourceCounts = {
    sites: 1,
    customDomains: 0,
    campaigns: 1,
    mediaAssets: 2,
  };
  public superadmins: Set<string> = new Set(["superadmin-1"]);

  async getSubscription(tenantId: string): Promise<TenantSubscription | null> {
    return this.subs.get(tenantId) || null;
  }

  async saveSubscription(subscription: TenantSubscription): Promise<void> {
    this.subs.set(subscription.tenantId, subscription);
  }

  async listAllSubscriptions(): Promise<TenantSubscription[]> {
    return Array.from(this.subs.values());
  }

  async countTenantResources(_tenantId: string): Promise<TenantResourceCounts> {
    return this.counts;
  }

  async isPlatformSuperadmin(userId: string): Promise<boolean> {
    return this.superadmins.has(userId);
  }
}

describe("Manage Subscription & Quotas Use Cases", () => {
  const auditGateway: AuditLogGateway = {
    record: vi.fn().mockResolvedValue(undefined),
    listRecent: vi.fn().mockResolvedValue([]),
  };

  it("initializes a default pro trial subscription when none exists", async () => {
    const repo = new InMemorySubscriptionRepository();
    const sub = await getTenantSubscriptionUseCase("tenant-1", repo);

    expect(sub.tenantId).toBe("tenant-1");
    expect(sub.planId).toBe("pro");
    expect(sub.status).toBe("trialing");
    expect(repo.subs.has("tenant-1")).toBe(true);
  });

  it("allows tenant owners to change plan and records audit log", async () => {
    const repo = new InMemorySubscriptionRepository();
    await getTenantSubscriptionUseCase("tenant-1", repo);

    const updated = await changeTenantPlanUseCase({
      tenantId: "tenant-1",
      newPlanId: "agency",
      actorUserId: "user-owner",
      actorRole: "owner",
      repository: repo,
      auditGateway,
    });

    expect(updated.planId).toBe("agency");
    expect(auditGateway.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        action: "subscription.plan_changed",
        metadata: {
          previousPlan: "pro",
          newPlan: "agency",
        },
      })
    );
  });

  it("rejects unauthorized non-owners attempting to change plan", async () => {
    const repo = new InMemorySubscriptionRepository();
    await getTenantSubscriptionUseCase("tenant-1", repo);

    await expect(
      changeTenantPlanUseCase({
        tenantId: "tenant-1",
        newPlanId: "agency",
        actorUserId: "user-editor",
        actorRole: "editor",
        repository: repo,
        auditGateway,
      })
    ).rejects.toThrow(SubscriptionAuthorizationError);
  });

  it("rejects invalid plan identifiers", async () => {
    const repo = new InMemorySubscriptionRepository();
    await getTenantSubscriptionUseCase("tenant-1", repo);

    await expect(
      changeTenantPlanUseCase({
        tenantId: "tenant-1",
        newPlanId: "invalid-tier" as any,
        actorUserId: "user-owner",
        actorRole: "owner",
        repository: repo,
        auditGateway,
      })
    ).rejects.toThrow(InvalidPlanError);
  });

  it("enforces tenant quotas and throws QuotaExceededError when limit reached", async () => {
    const repo = new InMemorySubscriptionRepository();
    // Set tenant to starter (max 1 site)
    repo.subs.set("tenant-1", {
      id: "s-1",
      tenantId: "tenant-1",
      planId: "starter",
      status: "active",
      currentPeriodStartsAt: "2026-09-01T00:00:00Z",
      currentPeriodEndsAt: "2026-10-01T00:00:00Z",
      cancelAtPeriodEnd: false,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
    });

    // counts.sites is 1, max is 1. Another site cannot be created.
    await expect(
      enforceTenantQuotaUseCase({
        tenantId: "tenant-1",
        resource: "sites",
        repository: repo,
      })
    ).rejects.toThrow(QuotaExceededError);

    // customDomains on starter is 0.
    await expect(
      enforceTenantQuotaUseCase({
        tenantId: "tenant-1",
        resource: "custom_domains",
        repository: repo,
      })
    ).rejects.toThrow(QuotaExceededError);
  });

  it("validates feature flags according to plan tier", async () => {
    const repo = new InMemorySubscriptionRepository();
    repo.subs.set("tenant-1", {
      id: "s-1",
      tenantId: "tenant-1",
      planId: "starter",
      status: "active",
      currentPeriodStartsAt: "2026-09-01T00:00:00Z",
      currentPeriodEndsAt: "2026-10-01T00:00:00Z",
      cancelAtPeriodEnd: false,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
    });

    await expect(
      checkTenantFeatureFlagUseCase({
        tenantId: "tenant-1",
        feature: "customDomains",
        repository: repo,
      })
    ).rejects.toThrow(FeatureNotAllowedError);
  });

  it("computes platform backoffice metrics accurately for superadmins", async () => {
    const repo = new InMemorySubscriptionRepository();
    repo.subs.set("tenant-1", {
      id: "s-1",
      tenantId: "tenant-1",
      planId: "pro",
      status: "active",
      currentPeriodStartsAt: "2026-09-01T00:00:00Z",
      currentPeriodEndsAt: "2026-10-01T00:00:00Z",
      cancelAtPeriodEnd: false,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
    });
    repo.subs.set("tenant-2", {
      id: "s-2",
      tenantId: "tenant-2",
      planId: "agency",
      status: "active",
      currentPeriodStartsAt: "2026-09-01T00:00:00Z",
      currentPeriodEndsAt: "2026-10-01T00:00:00Z",
      cancelAtPeriodEnd: false,
      createdAt: "2026-09-01T00:00:00Z",
      updatedAt: "2026-09-01T00:00:00Z",
    });

    const overview = await getPlatformBackofficeOverviewUseCase(true, repo);
    expect(overview.totalTenants).toBe(2);
    expect(overview.activeSubscriptions).toBe(2);
    expect(overview.estimatedMonthlyRecurringRevenueUsd).toBe(29 + 99); // Pro + Agency
  });

  it("rejects non-superadmins from accessing backoffice", async () => {
    const repo = new InMemorySubscriptionRepository();
    await expect(getPlatformBackofficeOverviewUseCase(false, repo)).rejects.toThrow(
      SubscriptionAuthorizationError
    );
  });

  it("gathers complete usage overview for billing dashboard", async () => {
    const repo = new InMemorySubscriptionRepository();
    const overview = await getTenantUsageOverviewUseCase("tenant-1", repo);

    expect(overview.subscription.planId).toBe("pro");
    expect(overview.quotas.sites.current).toBe(1);
    expect(overview.quotas.sites.limit).toBe(5);
    expect(overview.features.customDomains).toBe(true);
  });
});

