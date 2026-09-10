import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  addSiteDomainUseCase,
  verifySiteDomainUseCase,
  deleteSiteDomainUseCase,
  DomainAuthorizationError,
  InvalidDomainError,
  DomainAlreadyRegisteredError,
  DomainNotFoundError,
} from "../../src/application/domain/manage-domains";
import type { DomainRepository } from "../../src/application/domain/domain-repository";
import type { DnsResolverGateway } from "../../src/application/domain/dns-gateway";
import type { AuditLogGateway } from "../../src/application/audit/audit-gateway";
import type { SiteDomain } from "../../src/domain/domain/site-domain";

describe("Manage Domains Use Cases", () => {
  const mockUser: User = {
    id: "user-admin-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };

  const mockDomain: SiteDomain = {
    id: "domain-1",
    tenantId: "tenant-1",
    siteId: "site-1",
    domain: "taller-rayo.pe",
    status: "pending",
    verificationType: "cname",
    verificationToken: "saas-verify-abc-123",
    sslStatus: "pending",
    isPrimary: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockDomainRepo: DomainRepository = {
    listDomains: vi.fn().mockResolvedValue([mockDomain]),
    getDomain: vi.fn().mockImplementation((id) =>
      id === mockDomain.id ? Promise.resolve(mockDomain) : Promise.resolve(null)
    ),
    getDomainByName: vi.fn().mockResolvedValue(null),
    getVerifiedDomain: vi.fn().mockResolvedValue(null),
    saveDomain: vi.fn().mockImplementation((d) =>
      Promise.resolve({
        ...mockDomain,
        ...d,
        id: d.id || "new-domain-id",
        createdAt: mockDomain.createdAt,
        updatedAt: new Date().toISOString(),
      })
    ),
    deleteDomain: vi.fn().mockResolvedValue(undefined),
  };

  const mockDnsGateway: DnsResolverGateway = {
    resolveCname: vi.fn().mockResolvedValue(["cname.landingsaas.com"]),
    resolveTxt: vi.fn().mockResolvedValue([["saas-verify-abc-123"]]),
  };

  const mockAuditGateway: AuditLogGateway = {
    record: vi.fn().mockResolvedValue(undefined),
    listRecent: vi.fn().mockResolvedValue([]),
  };

  it("denies adding domain for viewer role", async () => {
    await expect(
      addSiteDomainUseCase(
        mockUser,
        "tenant-1",
        { siteId: "site-1", domain: "test.com" },
        "viewer",
        mockDomainRepo,
        mockAuditGateway
      )
    ).rejects.toThrow(DomainAuthorizationError);
  });

  it("rejects invalid domain names", async () => {
    await expect(
      addSiteDomainUseCase(
        mockUser,
        "tenant-1",
        { siteId: "site-1", domain: "localhost" },
        "editor",
        mockDomainRepo,
        mockAuditGateway
      )
    ).rejects.toThrow(InvalidDomainError);
  });

  it("rejects registering platform subdomain or host as custom domain", async () => {
    await expect(
      addSiteDomainUseCase(
        mockUser,
        "tenant-1",
        { siteId: "site-1", domain: "innovaciones-moreno.system-failed-tech.com" },
        "editor",
        mockDomainRepo,
        mockAuditGateway,
        "system-failed-tech.com"
      )
    ).rejects.toThrow(InvalidDomainError);

    await expect(
      addSiteDomainUseCase(
        mockUser,
        "tenant-1",
        { siteId: "site-1", domain: "system-failed-tech.com" },
        "editor",
        mockDomainRepo,
        mockAuditGateway,
        "system-failed-tech.com"
      )
    ).rejects.toThrow(InvalidDomainError);
  });

  it("rejects duplicate domain registration", async () => {
    const repoWithDuplicate = {
      ...mockDomainRepo,
      getDomainByName: vi.fn().mockResolvedValue(mockDomain),
    };

    await expect(
      addSiteDomainUseCase(
        mockUser,
        "tenant-1",
        { siteId: "site-1", domain: "taller-rayo.pe" },
        "editor",
        repoWithDuplicate,
        mockAuditGateway
      )
    ).rejects.toThrow(DomainAlreadyRegisteredError);
  });

  it("successfully adds domain and records audit log", async () => {
    const result = await addSiteDomainUseCase(
      mockUser,
      "tenant-1",
      { siteId: "site-1", domain: "taller-rayo.pe", verificationType: "cname" },
      "editor",
      mockDomainRepo,
      mockAuditGateway
    );

    expect(result.domain).toBe("taller-rayo.pe");
    expect(result.status).toBe("pending");
    expect(result.verificationToken).toMatch(/^saas-verify-/);
    expect(mockAuditGateway.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "domain.added",
        resourceType: "domain",
      })
    );
  });

  it("verifies CNAME record successfully", async () => {
    const result = await verifySiteDomainUseCase(
      mockUser,
      "tenant-1",
      "site-1",
      "domain-1",
      "editor",
      "cname.landingsaas.com",
      mockDomainRepo,
      mockDnsGateway,
      mockAuditGateway
    );

    expect(result.verified).toBe(true);
    expect(result.domain.status).toBe("verified");
    expect(result.domain.sslStatus).toBe("active");
    expect(mockAuditGateway.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "domain.verified",
      })
    );
  });

  it("handles failed CNAME verification gracefully", async () => {
    const failingDnsGateway: DnsResolverGateway = {
      resolveCname: vi.fn().mockResolvedValue(["wrong-target.com"]),
      resolveTxt: vi.fn().mockResolvedValue([]),
    };

    const result = await verifySiteDomainUseCase(
      mockUser,
      "tenant-1",
      "site-1",
      "domain-1",
      "editor",
      "cname.landingsaas.com",
      mockDomainRepo,
      failingDnsGateway,
      mockAuditGateway
    );

    expect(result.verified).toBe(false);
    expect(result.domain.status).toBe("failed");
    expect(result.message).toContain("no coincide con cname.landingsaas.com");
  });

  it("verifies TXT challenge record successfully", async () => {
    const txtDomain: SiteDomain = {
      ...mockDomain,
      id: "domain-txt-1",
      verificationType: "txt",
    };

    const repoWithTxt = {
      ...mockDomainRepo,
      getDomain: vi.fn().mockResolvedValue(txtDomain),
    };

    const result = await verifySiteDomainUseCase(
      mockUser,
      "tenant-1",
      "site-1",
      "domain-txt-1",
      "admin",
      "cname.landingsaas.com",
      repoWithTxt,
      mockDnsGateway,
      mockAuditGateway
    );

    expect(result.verified).toBe(true);
    expect(result.domain.status).toBe("verified");
  });

  it("deletes domain and records audit log", async () => {
    await deleteSiteDomainUseCase(
      mockUser,
      "tenant-1",
      "site-1",
      "domain-1",
      "editor",
      mockDomainRepo,
      mockAuditGateway
    );

    expect(mockDomainRepo.deleteDomain).toHaveBeenCalledWith("tenant-1", "site-1", "domain-1");
    expect(mockAuditGateway.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "domain.deleted",
      })
    );
  });

  it("throws DomainNotFoundError when trying to delete or verify non-existent domain", async () => {
    await expect(
      deleteSiteDomainUseCase(
        mockUser,
        "tenant-1",
        "site-1",
        "non-existent",
        "editor",
        mockDomainRepo,
        mockAuditGateway
      )
    ).rejects.toThrow(DomainNotFoundError);
  });
});

