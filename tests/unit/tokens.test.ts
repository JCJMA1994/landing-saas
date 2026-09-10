import { describe, expect, it } from "vitest";
import {
  getAccessibleTextColor,
  getContrastRatio,
  getRelativeLuminance,
  hexToRgb,
  isWcagAaCompliant,
  serializeCssVariables,
  themeToCssVariables,
} from "../../src/domain/design-system/tokens";
import type { SiteTheme } from "../../src/domain/site/theme";

describe("Design System Tokens & Contrast Calculations", () => {
  it("parses valid 6-character hex colors to RGB channels", () => {
    expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
    expect(hexToRgb("#3b82f6")).toEqual({ r: 59, g: 130, b: 246 });
    expect(hexToRgb("invalid")).toBeNull();
    expect(hexToRgb("#123")).toBeNull();
  });

  it("calculates relative luminance according to WCAG formula", () => {
    expect(getRelativeLuminance("#ffffff")).toBeCloseTo(1.0, 2);
    expect(getRelativeLuminance("#000000")).toBeCloseTo(0.0, 2);
  });

  it("calculates contrast ratios and verifies WCAG AA compliance", () => {
    // Pure black and white is 21:1
    const maxContrast = getContrastRatio("#000000", "#ffffff");
    expect(maxContrast).toBeCloseTo(21, 0);
    expect(isWcagAaCompliant("#000000", "#ffffff")).toBe(true);

    // Identical colors have 1:1 contrast and fail AA
    const minContrast = getContrastRatio("#3b82f6", "#3b82f6");
    expect(minContrast).toBeCloseTo(1, 0);
    expect(isWcagAaCompliant("#3b82f6", "#3b82f6")).toBe(false);

    // White on dark blue background
    expect(isWcagAaCompliant("#ffffff", "#0a0f1e")).toBe(true);
  });

  it("determines accessible text color (black or white) automatically", () => {
    // White background needs dark text
    expect(getAccessibleTextColor("#ffffff")).toBe("#0f172a");
    // Very dark background needs white text
    expect(getAccessibleTextColor("#0a0f1e")).toBe("#ffffff");
  });

  it("converts SiteTheme to CSS variables correctly", () => {
    const mockTheme: SiteTheme = {
      siteId: "site-123",
      primaryColor: "#3b82f6",
      secondaryColor: "#64748b",
      accentColor: "#f59e0b",
      backgroundColor: "#0a0f1e",
      textColor: "#f8fafc",
      fontKey: "outfit",
      radiusKey: "rounded",
      buttonVariant: "solid",
      cardVariant: "glass",
    };

    const vars = themeToCssVariables(mockTheme);

    expect(vars["--ds-color-primary"]).toBe("#3b82f6");
    expect(vars["--ds-color-background"]).toBe("#0a0f1e");
    expect(vars["--ds-theme-font"]).toBe("var(--ds-font-outfit)");
    expect(vars["--ds-theme-radius"]).toBe("var(--ds-radius-rounded)");
    expect(vars["--ds-color-button-text"]).toBe("#0f172a");

    const serialized = serializeCssVariables(vars);
    expect(serialized).toContain("--ds-color-primary: #3b82f6;");
    expect(serialized).toContain("--ds-theme-radius: var(--ds-radius-rounded);");
  });
});
