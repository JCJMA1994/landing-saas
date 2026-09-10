import { describe, expect, it, vi } from "vitest";
import type { User, SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateTemplateSwitchUseCase,
  switchSiteTemplateUseCase,
  TemplateSwitchAuthorizationError,
  InvalidTemplateError,
} from "../../src/application/template/manage-template-registry";
import type { ThemeRepository } from "../../src/application/site/theme-repository";
import type { CampaignRepository } from "../../src/application/campaign/campaign-repository";
import type { CardRepository } from "../../src/application/site/card-repository";
import type { PromotionRepository } from "../../src/application/site/promotion-repository";
import type { ContactRepository } from "../../src/application/site/contact-repository";
import type { AuditLogGateway } from "../../src/application/audit/audit-gateway";
import type { SiteCampaign } from "../../src/domain/campaign/campaign";
import type { SiteTheme } from "../../src/domain/site/theme";

describe("Template Switch Use Cases", () => {
  const mockUser: User = {
    id: "user-editor-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };

  const mockCampaign: SiteCampaign = {
    id: "camp-1",
    siteId: "site-1",
    name: "Holiday Promo",
    preset: "navidad",
    intensity: "festive",
    status: "active",
    priority: 1,
    timezone: "UTC",
    startsAt: "2026-12-01T00:00:00Z",
    endsAt: "2026-12-25T23:59:59Z",
    bannerText: "Navidad!",
    showCountdown: true,
  };

  const mockTheme: SiteTheme = {
    siteId: "site-1",
    primaryColor: "#0284c7",
    secondaryColor: "#0f172a",
    accentColor: "#f59e0b",
    backgroundColor: "#ffffff",
    textColor: "#0f172a",
    fontKey: "inter",
    radiusKey: "subtle",
    buttonVariant: "solid",
    cardVariant: "bordered",
  };

  const mockCampaignRepo: CampaignRepository = {
    listCampaigns: vi.fn().mockResolvedValue([mockCampaign]),
    getCampaign: vi.fn().mockResolvedValue(mockCampaign),
    saveCampaign: vi.fn().mockImplementation((c) => Promise.resolve(c)),
    deleteCampaign: vi.fn().mockResolvedValue(undefined),
    getActiveOrScheduledCampaigns: vi.fn().mockResolvedValue([mockCampaign]),
  };

  const mockThemeRepo: ThemeRepository = {
    getTheme: vi.fn().mockResolvedValue(mockTheme),
    saveTheme: vi.fn().mockResolvedValue(undefined),
  };

  const mockCardRepo: CardRepository = {
    listCards: vi.fn().mockResolvedValue([]),
    saveCard: vi.fn().mockResolvedValue(undefined),
    deleteCard: vi.fn().mockResolvedValue(undefined),
  };

  const mockPromoRepo: PromotionRepository = {
    listPromotions: vi.fn().mockResolvedValue([]),
    savePromotion: vi.fn().mockResolvedValue(undefined),
    deletePromotion: vi.fn().mockResolvedValue(undefined),
  };

  const mockContactRepo: ContactRepository = {
    getContacts: vi.fn().mockResolvedValue({ siteId: "site-1", email: "test@example.com" }),
    saveContacts: vi.fn().mockImplementation((_siteId, c) => Promise.resolve(c)),
  };

  const mockAuditGateway: AuditLogGateway = {
    record: vi.fn().mockResolvedValue(undefined),
    listRecent: vi.fn().mockResolvedValue([]),
  };

  it("evaluates template switch and detects degraded campaign slots", async () => {
    const report = await evaluateTemplateSwitchUseCase({
      siteId: "site-1",
      targetTemplateKey: "system-monitor",
      campaignRepo: mockCampaignRepo,
      themeRepo: mockThemeRepo,
      cardRepo: mockCardRepo,
      promoRepo: mockPromoRepo,
      contactRepo: mockContactRepo,
    });

    expect(report.isCompatible).toBe(true);
    expect(report.warnings.length).toBeGreaterThan(0);
    const degradationWarning = report.warnings.find(
      (w) => w.code === "CAMPAIGN_DECORATIONS_DEGRADED"
    );
    expect(degradationWarning).toBeDefined();
    expect(degradationWarning?.message).toContain("decoraciones");
  });

  it("throws InvalidTemplateError on invalid target template in evaluation", async () => {
    await expect(
      evaluateTemplateSwitchUseCase({
        siteId: "site-1",
        targetTemplateKey: "non-existent-template" as any,
        campaignRepo: mockCampaignRepo,
        themeRepo: mockThemeRepo,
        cardRepo: mockCardRepo,
        promoRepo: mockPromoRepo,
        contactRepo: mockContactRepo,
      })
    ).rejects.toThrow(InvalidTemplateError);
  });

  it("denies template switch for unauthorized roles (e.g. viewer)", async () => {
    const mockSupabase = {} as SupabaseClient;

    await expect(
      switchSiteTemplateUseCase(
        mockUser,
        "tenant-1",
        "site-1",
        "tech-editorial",
        "viewer",
        mockSupabase,
        mockThemeRepo,
        mockAuditGateway
      )
    ).rejects.toThrow(TemplateSwitchAuthorizationError);
  });

  it("denies template switch for invalid template key", async () => {
    const mockSupabase = {} as SupabaseClient;

    await expect(
      switchSiteTemplateUseCase(
        mockUser,
        "tenant-1",
        "site-1",
        "invalid-template-key" as any,
        "admin",
        mockSupabase,
        mockThemeRepo,
        mockAuditGateway
      )
    ).rejects.toThrow(InvalidTemplateError);
  });

  it("successfully switches template and records audit log", async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const selectSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { template_key: "tech-diagnostic" },
            error: null,
          }),
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "sites") {
          return {
            select: selectSpy,
            update: updateSpy,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const result = await switchSiteTemplateUseCase(
      mockUser,
      "tenant-1",
      "site-1",
      "cyber-performance",
      "admin",
      mockSupabase,
      mockThemeRepo,
      mockAuditGateway,
      { applySuggestedVariants: false }
    );

    expect(result.ok).toBe(true);
    expect(result.report.targetTemplateKey).toBe("cyber-performance");

    expect(mockAuditGateway.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        actorUserId: "user-editor-1",
        action: "site_template.switched",
        resourceType: "site",
        resourceId: "site-1",
        metadata: expect.objectContaining({
          previousTemplateKey: "tech-diagnostic",
          newTemplateKey: "cyber-performance",
          appliedSuggestedVariants: false,
        }),
      })
    );
  });

  it("applies suggested design variants when applySuggestedVariants is true", async () => {
    const updateSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const selectSpy = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { template_key: "tech-diagnostic" },
            error: null,
          }),
        }),
      }),
    });

    const mockSupabase = {
      from: vi.fn((table: string) => {
        if (table === "sites") {
          return {
            select: selectSpy,
            update: updateSpy,
          };
        }
        return {};
      }),
    } as unknown as SupabaseClient;

    const saveThemeSpy = vi.spyOn(mockThemeRepo, "saveTheme");

    const result = await switchSiteTemplateUseCase(
      mockUser,
      "tenant-1",
      "site-1",
      "tech-editorial",
      "editor",
      mockSupabase,
      mockThemeRepo,
      mockAuditGateway,
      { applySuggestedVariants: true }
    );

    expect(result.ok).toBe(true);
    expect(saveThemeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        siteId: "site-1",
        fontKey: "inter",
        radiusKey: "sharp",
        buttonVariant: "ghost",
        cardVariant: "flat",
      })
    );
  });
});
