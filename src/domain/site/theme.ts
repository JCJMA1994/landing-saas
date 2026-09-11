export const THEME_FONTS = ["inter", "roboto", "outfit", "space-grotesk"] as const;
export type ThemeFont = (typeof THEME_FONTS)[number];

export const THEME_RADII = ["sharp", "subtle", "rounded", "pill"] as const;
export type ThemeRadius = (typeof THEME_RADII)[number];

export const THEME_BUTTON_VARIANTS = ["solid", "outline", "ghost", "gradient"] as const;
export type ThemeButtonVariant = (typeof THEME_BUTTON_VARIANTS)[number];

export const THEME_CARD_VARIANTS = ["flat", "elevated", "bordered", "glass"] as const;
export type ThemeCardVariant = (typeof THEME_CARD_VARIANTS)[number];

export interface SiteTheme {
  siteId: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  textColor: string;
  fontKey: ThemeFont;
  radiusKey: ThemeRadius;
  buttonVariant: ThemeButtonVariant;
  cardVariant: ThemeCardVariant;
  faviconUrl?: string | undefined;
  updatedAt?: string | undefined;
}

const HEX_COLOR_REGEX = /^#[0-9a-fA-F]{6}$/;

export function isValidHexColor(color: string): boolean {
  return HEX_COLOR_REGEX.test(color);
}

export const DEFAULT_SITE_THEME: Omit<SiteTheme, "siteId" | "updatedAt"> = {
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
