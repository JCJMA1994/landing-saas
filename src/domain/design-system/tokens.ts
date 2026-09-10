import type { SiteTheme, ThemeFont, ThemeRadius } from "../site/theme";

export interface SemanticColorTokens {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  surface: string;
  border: string;
  muted: string;
}

export const FONT_MAP: Record<ThemeFont, string> = {
  inter: "var(--ds-font-inter)",
  roboto: "var(--ds-font-roboto)",
  outfit: "var(--ds-font-outfit)",
  "space-grotesk": "var(--ds-font-space-grotesk)",
};

export const RADIUS_MAP: Record<ThemeRadius, string> = {
  sharp: "var(--ds-radius-sharp)",
  subtle: "var(--ds-radius-subtle)",
  rounded: "var(--ds-radius-rounded)",
  pill: "var(--ds-radius-pill)",
};

/**
 * Converts standard 6-digit hex color to RGB channels
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const sanitized = hex.trim().replace(/^#/, "");
  if (sanitized.length !== 6) return null;
  const num = parseInt(sanitized, 16);
  if (isNaN(num)) return null;

  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Computes WCAG 2.1 relative luminance
 */
export function getRelativeLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((val) => {
    const s = val / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });

  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/**
 * Computes WCAG contrast ratio between two hex colors (range 1:1 to 21:1)
 */
export function getContrastRatio(hex1: string, hex2: string): number {
  const lum1 = getRelativeLuminance(hex1);
  const lum2 = getRelativeLuminance(hex2);
  const brighter = Math.max(lum1, lum2);
  const darker = Math.min(lum1, lum2);

  return (brighter + 0.05) / (darker + 0.05);
}

/**
 * Determines whether two colors pass WCAG AA requirement
 * Normal text: >= 4.5:1
 * Large text (18pt / 24px or bold 14pt / 18.66px): >= 3.0:1
 */
export function isWcagAaCompliant(foregroundHex: string, backgroundHex: string, isLargeText = false): boolean {
  const ratio = getContrastRatio(foregroundHex, backgroundHex);
  return isLargeText ? ratio >= 3.0 : ratio >= 4.5;
}

/**
 * Returns either high-contrast light (#ffffff) or dark (#0f172a) text for a given background
 */
export function getAccessibleTextColor(backgroundHex: string): string {
  const ratioWithWhite = getContrastRatio("#ffffff", backgroundHex);
  const ratioWithDark = getContrastRatio("#0f172a", backgroundHex);

  return ratioWithWhite >= ratioWithDark ? "#ffffff" : "#0f172a";
}

/**
 * Converts a SiteTheme entity to CSS Custom Properties record
 */
export function themeToCssVariables(theme: SiteTheme): Record<string, string> {
  const fontValue = FONT_MAP[theme.fontKey] ?? FONT_MAP.inter;
  const radiusValue = RADIUS_MAP[theme.radiusKey] ?? RADIUS_MAP.subtle;

  // Derive subtle surface and border from background
  const bgLuminance = getRelativeLuminance(theme.backgroundColor);
  const isDark = bgLuminance < 0.2;

  const surfaceColor = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.03)";
  const surfaceElevated = isDark ? "rgba(255, 255, 255, 0.07)" : "rgba(255, 255, 255, 0.9)";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)";
  const mutedText = isDark ? "rgba(248, 250, 252, 0.65)" : "rgba(15, 23, 42, 0.65)";

  const buttonText = getAccessibleTextColor(theme.primaryColor);

  return {
    "--ds-color-primary": theme.primaryColor,
    "--ds-color-secondary": theme.secondaryColor,
    "--ds-color-accent": theme.accentColor,
    "--ds-color-background": theme.backgroundColor,
    "--ds-color-text": theme.textColor,
    "--ds-color-surface": surfaceColor,
    "--ds-color-surface-elevated": surfaceElevated,
    "--ds-color-border": borderColor,
    "--ds-color-muted": mutedText,
    "--ds-color-button-text": buttonText,
    "--ds-theme-font": fontValue,
    "--ds-theme-radius": radiusValue,
    "--ds-button-variant": theme.buttonVariant,
    "--ds-card-variant": theme.cardVariant,
  };
}

/**
 * Serializes CSS variables into an inline style string for HTML tags
 */
export function serializeCssVariables(variables: Record<string, string>): string {
  return Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join(" ");
}
