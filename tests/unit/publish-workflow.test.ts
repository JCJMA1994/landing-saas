import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  publishSiteUseCase,
  rollbackSiteUseCase,
  PublicationAuthorizationError,
  PublicationNotFoundError,
  type SiteMetaInfo,
} from "../../src/application/publication/manage-publication";
import type { PublicationRepository } from "../../src/application/publication/publication-repository";
import type { SitePublication } from "../../src/domain/publication/publication";
import type { PublicationSnapshot } from "../../src/domain/publication/snapshot";
import { DEFAULT_SITE_THEME } from "../../src/domain/site/theme";

describe("Publication & Rollback Workflow", () => {
  const mockUser: User = {
    id: "user-owner-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };

  const mockSiteMeta: SiteMetaInfo = {
    id: "site-100",
    name: "Precision Labs",
    slug: "precision-labs",
    templateKey: "tech-diagnostic",
  };

  const mockThemeRepo = {
    getTheme: vi.fn().mockResolvedValue({
      siteId: "site-100",
      ...DEFAULT_SITE_THEME,
    }),
    saveTheme: vi.fn(),
  };

  const mockHeroRepo = {
    getHero: vi.fn().mockResolvedValue({
      siteId: "site-100",
      headline: "Telemetry Redefined",
      subheadline: "Real time systems",
      ctaText: "Get Access",
      ctaLink: "#access",
    }),
    saveHero: vi.fn(),
  };

  const mockCardRepo = {
    listCards: vi.fn().mockResolvedValue([]),
    getCard: vi.fn(),
    saveCard: vi.fn(),
    deleteCard: vi.fn(),
  };

  const mockPromoRepo = {
    listPromotions: vi.fn().mockResolvedValue([]),
    getPromotion: vi.fn(),
    savePromotion: vi.fn(),
    deletePromotion: vi.fn(),
  };

  const mockContactRepo = {
    getContacts: vi.fn().mockResolvedValue(null),
    saveContacts: vi.fn(),
  };

  const mockAuditGateway = {
    record: vi.fn().mockResolvedValue(undefined),
    listRecent: vi.fn(),
  };

  it("denies publish access to users with viewer role", async () => {
    const mockPubRepo = {} as PublicationRepository;

    await expect(
      publishSiteUseCase(
        mockUser,
        "tenant-1",
        mockSiteMeta,
        "viewer",
        mockThemeRepo,
        mockHeroRepo,
        mockCardRepo,
        mockPromoRepo,
        mockContactRepo,
        mockPubRepo,
        mockAuditGateway
      )
    ).rejects.toThrow(PublicationAuthorizationError);
  });

  it("publishes site draft into an immutable snapshot and records audit event", async () => {
    const publishedPublication: SitePublication = {
      id: "pub-1",
      siteId: "site-100",
      version: 1,
      snapshot: {} as PublicationSnapshot,
      checksum: "abc123sha256",
      publishedBy: "user-owner-1",
      publishedAt: new Date().toISOString(),
      isActive: true,
    };

    const mockPubRepo: PublicationRepository = {
      publishSnapshot: vi.fn().mockResolvedValue(publishedPublication),
      getActivePublication: vi.fn(),
      getActivePublicationBySlug: vi.fn(),
      getPublicationByVersion: vi.fn(),
      listHistory: vi.fn(),
    };

    const result = await publishSiteUseCase(
      mockUser,
      "tenant-1",
      mockSiteMeta,
      "owner",
      mockThemeRepo,
      mockHeroRepo,
      mockCardRepo,
      mockPromoRepo,
      mockContactRepo,
      mockPubRepo,
      mockAuditGateway
    );

    expect(result.version).toBe(1);
    expect(result.isActive).toBe(true);
    expect(mockPubRepo.publishSnapshot).toHaveBeenCalledOnce();
    expect(mockAuditGateway.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "site.published",
        resourceType: "site_publication",
        resourceId: "pub-1",
      })
    );
  });

  it("rolls back to previous version by generating a new version and recording audit event", async () => {
    const historicalVersion1: SitePublication = {
      id: "pub-1",
      siteId: "site-100",
      version: 1,
      snapshot: {
        schemaVersion: 1,
        siteId: "site-100",
        siteName: "Precision Labs",
        siteSlug: "precision-labs",
        templateKey: "tech-diagnostic",
        templateVersion: 1,
        theme: { siteId: "site-100", ...DEFAULT_SITE_THEME },
        hero: null,
        cards: [],
        promotions: [],
        contacts: null,
        publishedAt: "2026-09-01T00:00:00.000Z",
      },
      checksum: "checksum-v1",
      publishedBy: "user-owner-1",
      publishedAt: "2026-09-01T00:00:00.000Z",
      isActive: false,
    };

    const rollbackPublicationV3: SitePublication = {
      id: "pub-3",
      siteId: "site-100",
      version: 3,
      snapshot: historicalVersion1.snapshot,
      checksum: "checksum-v3",
      publishedBy: "user-owner-1",
      publishedAt: new Date().toISOString(),
      isActive: true,
    };

    const mockPubRepo: PublicationRepository = {
      publishSnapshot: vi.fn().mockResolvedValue(rollbackPublicationV3),
      getActivePublication: vi.fn(),
      getActivePublicationBySlug: vi.fn(),
      getPublicationByVersion: vi.fn().mockImplementation((_siteId, version) => {
        if (version === 1) return Promise.resolve(historicalVersion1);
        return Promise.resolve(null);
      }),
      listHistory: vi.fn(),
    };

    const result = await rollbackSiteUseCase(
      mockUser,
      "tenant-1",
      "site-100",
      1,
      "admin",
      mockPubRepo,
      mockAuditGateway
    );

    // Rollback creates a new version (v3) rather than resurrecting old record (v1)
    expect(result.version).toBe(3);
    expect(mockPubRepo.publishSnapshot).toHaveBeenCalledOnce();
    expect(mockAuditGateway.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "site.rolled_back",
        resourceType: "site_publication",
        resourceId: "pub-3",
        metadata: expect.objectContaining({
          newVersion: 3,
          rolledBackFromVersion: 1,
        }),
      })
    );
  });

  it("rejects rollback if target version does not exist", async () => {
    const mockPubRepo: PublicationRepository = {
      publishSnapshot: vi.fn(),
      getActivePublication: vi.fn(),
      getActivePublicationBySlug: vi.fn(),
      getPublicationByVersion: vi.fn().mockResolvedValue(null),
      listHistory: vi.fn(),
    };

    await expect(
      rollbackSiteUseCase(
        mockUser,
        "tenant-1",
        "site-100",
        99,
        "owner",
        mockPubRepo,
        mockAuditGateway
      )
    ).rejects.toThrow(PublicationNotFoundError);
  });
});
