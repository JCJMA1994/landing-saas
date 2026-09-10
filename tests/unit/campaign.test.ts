import { describe, expect, it } from "vitest";
import {
  validateCampaignDates,
  isCampaignPreset,
  isCampaignIntensity,
  isCampaignStatus,
  InvalidCampaignError,
} from "../../src/domain/campaign/campaign";
import { getCampaignPresetConfig } from "../../src/domain/campaign/presets";

describe("Campaign Domain & Presets", () => {
  it("validates campaign date ranges correctly", () => {
    expect(() =>
      validateCampaignDates("2026-07-28T00:00:00Z", "2026-07-30T00:00:00Z")
    ).not.toThrow();

    // Inverted range
    expect(() =>
      validateCampaignDates("2026-07-30T00:00:00Z", "2026-07-28T00:00:00Z")
    ).toThrow(InvalidCampaignError);

    // Identical start and end
    expect(() =>
      validateCampaignDates("2026-07-28T00:00:00Z", "2026-07-28T00:00:00Z")
    ).toThrow("Campaign endsAt must be strictly greater than startsAt.");

    // Malformed timestamps
    expect(() => validateCampaignDates("invalid", "2026-07-30T00:00:00Z")).toThrow(
      "Invalid startsAt timestamp format."
    );
    expect(() => validateCampaignDates("2026-07-28T00:00:00Z", "invalid")).toThrow(
      "Invalid endsAt timestamp format."
    );
  });

  it("checks presets, intensities and statuses strictly", () => {
    expect(isCampaignPreset("fiestas-patrias")).toBe(true);
    expect(isCampaignPreset("navidad")).toBe(true);
    expect(isCampaignPreset("ano-nuevo")).toBe(true);
    expect(isCampaignPreset("custom")).toBe(true);
    expect(isCampaignPreset("halloween")).toBe(false);

    expect(isCampaignIntensity("subtle")).toBe(true);
    expect(isCampaignIntensity("balanced")).toBe(true);
    expect(isCampaignIntensity("festive")).toBe(true);
    expect(isCampaignIntensity("extreme")).toBe(false);

    expect(isCampaignStatus("draft")).toBe(true);
    expect(isCampaignStatus("scheduled")).toBe(true);
    expect(isCampaignStatus("active")).toBe(true);
    expect(isCampaignStatus("archived")).toBe(true);
    expect(isCampaignStatus("unknown")).toBe(false);
  });

  it("returns appropriate preset configs with allowed overrides", () => {
    const fiestasPatrias = getCampaignPresetConfig("fiestas-patrias");
    expect(fiestasPatrias.displayName).toBe("Fiestas Patrias");
    expect(fiestasPatrias.allowedOverrides).toContain("bannerText");
    expect(fiestasPatrias.defaultAccentColor).toBe("#dc2626");

    const navidad = getCampaignPresetConfig("navidad");
    expect(navidad.displayName).toContain("Navidad");
    expect(navidad.seasonalEmoji).toBe("🎄");
  });
});
