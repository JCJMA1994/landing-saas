import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_THEME,
  isValidHexColor,
  THEME_BUTTON_VARIANTS,
  THEME_CARD_VARIANTS,
  THEME_FONTS,
  THEME_RADII,
} from "../../src/domain/site/theme";

describe("site theme domain", () => {
  it("validates 6-character hex colors strictly", () => {
    expect(isValidHexColor("#ffffff")).toBe(true);
    expect(isValidHexColor("#000000")).toBe(true);
    expect(isValidHexColor("#3b82f6")).toBe(true);
    expect(isValidHexColor("#3B82F6")).toBe(true);

    // Invalid colors
    expect(isValidHexColor("red")).toBe(false);
    expect(isValidHexColor("#fff")).toBe(false);
    expect(isValidHexColor("#fffffff")).toBe(false);
    expect(isValidHexColor("3b82f6")).toBe(false);
    expect(isValidHexColor("rgb(0,0,0)")).toBe(false);
    expect(isValidHexColor("")).toBe(false);
  });

  it("contains expected default design tokens", () => {
    expect(THEME_FONTS).toContain(DEFAULT_SITE_THEME.fontKey);
    expect(THEME_RADII).toContain(DEFAULT_SITE_THEME.radiusKey);
    expect(THEME_BUTTON_VARIANTS).toContain(DEFAULT_SITE_THEME.buttonVariant);
    expect(THEME_CARD_VARIANTS).toContain(DEFAULT_SITE_THEME.cardVariant);
    expect(isValidHexColor(DEFAULT_SITE_THEME.primaryColor)).toBe(true);
    expect(isValidHexColor(DEFAULT_SITE_THEME.backgroundColor)).toBe(true);
  });
});
