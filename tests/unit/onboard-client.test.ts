import { describe, expect, it } from "vitest";
import {
  onboardClientUseCase,
  OnboardingValidationError,
  SlugAlreadyTakenError,
  type ClientOnboardingGateway,
  type OnboardClientInput,
} from "../../src/application/saas/onboard-client";

class MockOnboardingGateway implements ClientOnboardingGateway {
  public takenSlugs: Set<string> = new Set(["existing-slug"]);
  public users: Map<string, { id: string; email: string }> = new Map();
  public tenants: Map<string, { id: string; name: string }> = new Map();
  public members: Array<{ tenantId: string; userId: string; role: string }> = [];
  public sites: Array<{ id: string; tenantId: string; name: string; slug: string; templateKey: string }> = [];
  public subscriptions: Map<string, string> = new Map();
  public initializedContent: Set<string> = new Set();

  async isSlugTaken(slug: string): Promise<boolean> {
    return this.takenSlugs.has(slug);
  }

  async findOrCreateUser(email: string, _password: string): Promise<{ id: string; email: string }> {
    const existing = this.users.get(email);
    if (existing) return existing;
    const user = { id: `user-${this.users.size + 1}`, email };
    this.users.set(email, user);
    return user;
  }

  async createTenant(name: string): Promise<{ id: string; name: string }> {
    const tenant = { id: `tenant-${this.tenants.size + 1}`, name };
    this.tenants.set(tenant.id, tenant);
    return tenant;
  }

  async addTenantMember(tenantId: string, userId: string, role: any): Promise<void> {
    this.members.push({ tenantId, userId, role });
  }

  async createSite(
    tenantId: string,
    name: string,
    slug: string,
    templateKey: any
  ): Promise<{ id: string; name: string; slug: string }> {
    const site = {
      id: `site-${this.sites.length + 1}`,
      tenantId,
      name,
      slug,
      templateKey,
    };
    this.sites.push(site);
    this.takenSlugs.add(slug);
    return { id: site.id, name: site.name, slug: site.slug };
  }

  async createSubscription(tenantId: string, planId: any): Promise<void> {
    this.subscriptions.set(tenantId, planId);
  }

  async initializeSiteContent(siteId: string, _siteName: string, _templateKey: any): Promise<void> {
    this.initializedContent.add(siteId);
  }
}

describe("Client Onboarding Use Case", () => {
  const validInput: OnboardClientInput = {
    tenantName: "Acme Logistics",
    clientEmail: "owner@acme.test",
    clientPassword: "supersecretpassword123",
    siteName: "Acme Landing",
    siteSlug: "acme-logistics",
    templateKey: "friendly-tech",
    planId: "pro",
    superadminUserId: "superadmin-1",
  };

  it("fails if caller is not a platform superadmin", async () => {
    const gateway = new MockOnboardingGateway();
    await expect(onboardClientUseCase(validInput, gateway, false)).rejects.toThrow(
      OnboardingValidationError
    );
  });

  it("fails if site slug is already taken", async () => {
    const gateway = new MockOnboardingGateway();
    const input = { ...validInput, siteSlug: "existing-slug" };
    await expect(onboardClientUseCase(input, gateway, true)).rejects.toThrow(
      SlugAlreadyTakenError
    );
  });

  it("validates input fields (tenant name, email, password, slug, template, plan)", async () => {
    const gateway = new MockOnboardingGateway();

    await expect(
      onboardClientUseCase({ ...validInput, tenantName: " " }, gateway, true)
    ).rejects.toThrow("Tenant name");

    await expect(
      onboardClientUseCase({ ...validInput, clientEmail: "notanemail" }, gateway, true)
    ).rejects.toThrow("valid client email");

    await expect(
      onboardClientUseCase({ ...validInput, clientPassword: "short" }, gateway, true)
    ).rejects.toThrow("at least 8 characters");

    await expect(
      onboardClientUseCase({ ...validInput, siteSlug: "INVALID_SLUG!" }, gateway, true)
    ).rejects.toThrow("Site identifier");

    await expect(
      onboardClientUseCase({ ...validInput, templateKey: "non-existent" as any }, gateway, true)
    ).rejects.toThrow("Invalid template key");

    await expect(
      onboardClientUseCase({ ...validInput, planId: "invalid-plan" as any }, gateway, true)
    ).rejects.toThrow("Invalid plan");
  });

  it("successfully onboards client and connects tenant, client owner, superadmin admin, site, and default content", async () => {
    const gateway = new MockOnboardingGateway();
    const result = await onboardClientUseCase(validInput, gateway, true);

    expect(result.tenantName).toBe("Acme Logistics");
    expect(result.siteSlug).toBe("acme-logistics");
    expect(result.clientEmail).toBe("owner@acme.test");
    expect(result.templateKey).toBe("friendly-tech");
    expect(result.planId).toBe("pro");

    // Client added as owner
    const clientMember = gateway.members.find(
      (m) => m.userId === result.clientUserId && m.role === "owner"
    );
    expect(clientMember).toBeDefined();

    // Superadmin added as admin for configuration
    const superadminMember = gateway.members.find(
      (m) => m.userId === "superadmin-1" && m.role === "admin"
    );
    expect(superadminMember).toBeDefined();

    // Site created and content initialized
    expect(gateway.sites.length).toBe(1);
    expect(gateway.initializedContent.has(result.siteId)).toBe(true);
    expect(gateway.subscriptions.get(result.tenantId)).toBe("pro");
  });
});
