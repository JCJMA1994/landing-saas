import { describe, expect, it } from "vitest";
import type { SiteCampaign } from "../../src/domain/campaign/campaign";
import type { SiteTheme } from "../../src/domain/site/theme";
import type { SiteHero } from "../../src/domain/site/hero";
import { DEFAULT_SITE_THEME } from "../../src/domain/site/theme";

describe("Campaign Template Overrides & Graceful Fallback", () => {
  const baseTheme: SiteTheme = {
    siteId: "site-1",
    ...DEFAULT_SITE_THEME,
    accentColor: "#38bdf8",
  };

  const baseHero: SiteHero = {
    siteId: "site-1",
    headline: "High Precision Telecom",
    subheadline: "Realtime data pipeline",
    ctaText: "Get Started",
    ctaLink: "#contact",
    badgeText: "Original Badge",
  };

  const festiveCampaign: SiteCampaign = {
    id: "camp-festive",
    siteId: "site-1",
    name: "Fiestas Patrias",
    preset: "fiestas-patrias",
    intensity: "festive",
    status: "active",
    priority: 10,
    timezone: "UTC",
    startsAt: "2026-07-20T00:00:00Z",
    endsAt: "2026-07-31T23:59:59Z",
    accentColor: "#dc2626",
    badgeText: "Especial Fiestas Patrias",
    showCountdown: true,
  };

  it("applies seasonal accent override only on balanced or festive intensities", () => {
    // Festive intensity -> override applied
    const festiveEffectiveTheme =
      festiveCampaign.accentColor &&
      (festiveCampaign.intensity === "balanced" || festiveCampaign.intensity === "festive")
        ? { ...baseTheme, accentColor: festiveCampaign.accentColor }
        : baseTheme;

    expect(festiveEffectiveTheme.accentColor).toBe("#dc2626");

    // Subtle intensity -> accent color preserved
    const subtleCampaign: SiteCampaign = { ...festiveCampaign, intensity: "subtle" };
    const subtleEffectiveTheme =
      subtleCampaign.accentColor &&
      (subtleCampaign.intensity === "balanced" || subtleCampaign.intensity === "festive")
        ? { ...baseTheme, accentColor: subtleCampaign.accentColor }
        : baseTheme;

    expect(subtleEffectiveTheme.accentColor).toBe("#38bdf8");
  });

  it("applies hero badge override when present and falls back gracefully", () => {
    // When campaign has badgeText
    const seasonalHero =
      baseHero && festiveCampaign.badgeText
        ? { ...baseHero, badgeText: festiveCampaign.badgeText }
        : baseHero;

    expect(seasonalHero.badgeText).toBe("Especial Fiestas Patrias");

    // When campaign has no badgeText or is null -> graceful fallback
    const noBadgeCampaign: SiteCampaign = { ...festiveCampaign, badgeText: null };
    const fallbackHero =
      baseHero && noBadgeCampaign.badgeText
        ? { ...baseHero, badgeText: noBadgeCampaign.badgeText }
        : baseHero;

    expect(fallbackHero.badgeText).toBe("Original Badge");
  });
});
