export interface SiteHero {
  siteId: string;
  headline: string;
  subheadline: string;
  ctaText: string;
  ctaLink: string;
  badgeText?: string | undefined;
  updatedAt?: string | undefined;
}

const SAFE_LINK_REGEX = /^(https?:\/\/|\/|mailto:|tel:|#).*/i;

export function isSafeLink(url: string): boolean {
  if (!url || url.length > 256) return false;
  const trimmed = url.trim();
  if (/^javascript:/i.test(trimmed) || /^data:/i.test(trimmed)) return false;
  return SAFE_LINK_REGEX.test(trimmed);
}

export const DEFAULT_SITE_HERO: Omit<SiteHero, "siteId" | "updatedAt"> = {
  headline: "Modern SaaS Solutions for Your Enterprise",
  subheadline: "Streamline your workflow with high-performance automated tools tailored for growth.",
  ctaText: "Get Started Now",
  ctaLink: "#contact",
  badgeText: "v1.0 Ready",
};
