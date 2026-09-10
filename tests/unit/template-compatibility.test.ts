import { describe, expect, it } from "vitest";
import {
  listRegisteredTemplates,
  supportsCampaignSlot,
  supportsSection,
} from "../../src/domain/template/registry";
import { checkTemplateCompatibility } from "../../src/domain/template/compatibility";
import type { SiteCampaign } from "../../src/domain/campaign/campaign";
import { DEFAULT_SITE_THEME } from "../../src/domain/site/theme";

describe("Versioned Template Registry & Compatibility", () => {
  it("lists all 6 authentic registered templates with version 1 and constraints", () => {
    const templates = listRegisteredTemplates();
    expect(templates).toHaveLength(6);

    for (const t of templates) {
      expect(t.version).toBeGreaterThanOrEqual(1);
      expect(t.tokenConstraints.allowedFonts.length).toBeGreaterThan(0);
      expect(t.tokenConstraints.preferredFont).toBeDefined();
    }
  });

  it("checks campaign slot support accurately", () => {
    // tech-diagnostic supports decorations
    expect(supportsCampaignSlot("tech-diagnostic", "decorations")).toBe(true);

    // system-monitor and tech-editorial do not support decorations slot (graceful degradation)
    expect(supportsCampaignSlot("system-monitor", "decorations")).toBe(false);
    expect(supportsCampaignSlot("tech-editorial", "decorations")).toBe(false);

    // all templates support core sections
    expect(supportsSection("friendly-tech", "hero")).toBe(true);
    expect(supportsSection("friendly-tech", "cards")).toBe(true);
  });

  it("generates compatibility warnings when festive campaign runs on a template without decorations", () => {
    const festiveCampaign: SiteCampaign = {
      id: "camp-festive-1",
      siteId: "site-1",
      name: "Navidad Luminosa",
      preset: "navidad",
      intensity: "festive",
      status: "active",
      priority: 10,
      timezone: "UTC",
      startsAt: "2026-12-01T00:00:00Z",
      endsAt: "2026-12-25T23:59:59Z",
      showCountdown: true,
    };

    // Evaluate compatibility against tech-editorial (no decorations slot)
    const report = checkTemplateCompatibility({
      targetTemplateKey: "tech-editorial",
      activeCampaigns: [festiveCampaign],
      currentTheme: { siteId: "site-1", ...DEFAULT_SITE_THEME, fontKey: "outfit" },
      hasHero: true,
      hasCards: true,
    });

    expect(report.isCompatible).toBe(true);
    expect(report.warnings.some((w) => w.code === "CAMPAIGN_DECORATIONS_DEGRADED")).toBe(true);
    expect(report.warnings.some((w) => w.code === "FONT_NOT_RECOMMENDED")).toBe(true);
    expect(report.suggestedThemeVariants.fontKey).toBe("inter");
  });

  it("reports zero warnings when switching to an aligned template", () => {
    const report = checkTemplateCompatibility({
      targetTemplateKey: "tech-diagnostic",
      currentTheme: {
        siteId: "site-1",
        ...DEFAULT_SITE_THEME,
        fontKey: "space-grotesk",
        radiusKey: "sharp",
      },
      hasHero: true,
      hasCards: true,
    });

    expect(report.isCompatible).toBe(true);
    expect(report.warnings).toHaveLength(0);
  });
});
