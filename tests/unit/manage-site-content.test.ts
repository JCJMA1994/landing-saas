import { describe, expect, it, vi } from "vitest";
import {
  getSiteHeroUseCase,
  getSiteThemeUseCase,
  saveSiteHeroUseCase,
  saveSiteThemeUseCase,
  SiteAuthorizationError,
  InvalidThemeError,
  InvalidHeroError,
} from "../../src/application/site/manage-site-content";
import type { ThemeRepository } from "../../src/application/site/theme-repository";
import type { HeroRepository } from "../../src/application/site/hero-repository";
import type { AuditLogGateway } from "../../src/application/audit/audit-gateway";
import type { SiteTheme } from "../../src/domain/site/theme";
import type { SiteHero } from "../../src/domain/site/hero";

const mockSiteId = "20000000-0000-0000-0000-000000000001";
const mockTenantId = "10000000-0000-0000-0000-000000000001";
const editorUser = { id: "00000000-0000-0000-0000-000000000001" };

const validTheme: SiteTheme = {
  siteId: mockSiteId,
  primaryColor: "#3b82f6",
  secondaryColor: "#64748b",
  accentColor: "#f59e0b",
  backgroundColor: "#0a0f1e",
  textColor: "#f8fafc",
  fontKey: "inter",
  radiusKey: "subtle",
  buttonVariant: "solid",
  cardVariant: "bordered",
};

const validHero: SiteHero = {
  siteId: mockSiteId,
  headline: "Scalable Enterprise SaaS",
  subheadline: "Accelerate your team workflow with high performance tools.",
  ctaText: "Get Started",
  ctaLink: "https://example.com/signup",
  badgeText: "v1.0",
};

function createMockThemeRepo(): ThemeRepository {
  return {
    getTheme: vi.fn().mockResolvedValue(validTheme),
    saveTheme: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockHeroRepo(): HeroRepository {
  return {
    getHero: vi.fn().mockResolvedValue(validHero),
    saveHero: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockAudit(): AuditLogGateway {
  return {
    record: vi.fn().mockResolvedValue(undefined),
    listRecent: vi.fn().mockResolvedValue([]),
  };
}

describe("manage site content use cases", () => {
  describe("theme management", () => {
    it("fetches site theme for authenticated actor", async () => {
      const repo = createMockThemeRepo();
      const theme = await getSiteThemeUseCase(editorUser, mockSiteId, repo);
      expect(theme).toEqual(validTheme);
    });

    it("rejects unauthenticated getSiteTheme", async () => {
      const repo = createMockThemeRepo();
      await expect(getSiteThemeUseCase(null, mockSiteId, repo)).rejects.toThrow(SiteAuthorizationError);
    });

    it("prevents viewers from updating theme", async () => {
      const repo = createMockThemeRepo();
      const audit = createMockAudit();
      await expect(
        saveSiteThemeUseCase(editorUser, mockTenantId, validTheme, "viewer", repo, audit),
      ).rejects.toThrow(SiteAuthorizationError);
    });

    it("rejects invalid hex colors during theme save", async () => {
      const repo = createMockThemeRepo();
      const audit = createMockAudit();
      const invalid = { ...validTheme, primaryColor: "red" };
      await expect(
        saveSiteThemeUseCase(editorUser, mockTenantId, invalid, "editor", repo, audit),
      ).rejects.toThrow(InvalidThemeError);
    });

    it("saves valid theme and records audit log for editor", async () => {
      const repo = createMockThemeRepo();
      const audit = createMockAudit();
      await saveSiteThemeUseCase(editorUser, mockTenantId, validTheme, "editor", repo, audit);

      expect(repo.saveTheme).toHaveBeenCalledWith(validTheme);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          actorUserId: editorUser.id,
          action: "site_theme.updated",
          resourceId: mockSiteId,
        }),
      );
    });
  });

  describe("hero management", () => {
    it("fetches site hero for authenticated actor", async () => {
      const repo = createMockHeroRepo();
      const hero = await getSiteHeroUseCase(editorUser, mockSiteId, repo);
      expect(hero).toEqual(validHero);
    });

    it("prevents viewers from updating hero", async () => {
      const repo = createMockHeroRepo();
      const audit = createMockAudit();
      await expect(
        saveSiteHeroUseCase(editorUser, mockTenantId, validHero, "viewer", repo, audit),
      ).rejects.toThrow(SiteAuthorizationError);
    });

    it("rejects dangerous CTA link during hero save", async () => {
      const repo = createMockHeroRepo();
      const audit = createMockAudit();
      const dangerous = { ...validHero, ctaLink: "javascript:alert(1)" };
      await expect(
        saveSiteHeroUseCase(editorUser, mockTenantId, dangerous, "editor", repo, audit),
      ).rejects.toThrow(InvalidHeroError);
    });

    it("saves valid hero and records audit log for editor", async () => {
      const repo = createMockHeroRepo();
      const audit = createMockAudit();
      await saveSiteHeroUseCase(editorUser, mockTenantId, validHero, "editor", repo, audit);

      expect(repo.saveHero).toHaveBeenCalledWith(
        expect.objectContaining({
          siteId: mockSiteId,
          headline: "Scalable Enterprise SaaS",
        }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          actorUserId: editorUser.id,
          action: "site_hero.updated",
          resourceId: mockSiteId,
        }),
      );
    });
  });
});
