import type { VerifiedUser } from "../auth/admin-access";
import { canEditContent, type TenantRole } from "../../domain/tenant/roles";
import { isValidHexColor, type SiteTheme } from "../../domain/site/theme";
import { isSafeLink, type SiteHero } from "../../domain/site/hero";
import type { ThemeRepository } from "./theme-repository";
import type { HeroRepository } from "./hero-repository";
import type { AuditLogGateway } from "../audit/audit-gateway";

export class SiteAuthorizationError extends Error {
  constructor(message = "You do not have permission to modify this site.") {
    super(message);
    this.name = "SiteAuthorizationError";
  }
}

export class InvalidThemeError extends Error {
  constructor(message = "Invalid theme configuration provided.") {
    super(message);
    this.name = "InvalidThemeError";
  }
}

export class InvalidHeroError extends Error {
  constructor(message = "Invalid hero content provided.") {
    super(message);
    this.name = "InvalidHeroError";
  }
}

export async function getSiteThemeUseCase(
  actor: VerifiedUser | null,
  siteId: string,
  repo: ThemeRepository,
): Promise<SiteTheme | null> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  return repo.getTheme(siteId);
}

export async function saveSiteThemeUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  theme: SiteTheme,
  actorRole: TenantRole,
  repo: ThemeRepository,
  audit: AuditLogGateway,
): Promise<void> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  if (!canEditContent(actorRole)) {
    throw new SiteAuthorizationError("Insufficient permissions to update site theme.");
  }

  // Validate hex colors
  if (
    !isValidHexColor(theme.primaryColor) ||
    !isValidHexColor(theme.secondaryColor) ||
    !isValidHexColor(theme.accentColor) ||
    !isValidHexColor(theme.backgroundColor) ||
    !isValidHexColor(theme.textColor)
  ) {
    throw new InvalidThemeError("All color tokens must be valid 6-character hex strings.");
  }

  await repo.saveTheme(theme);

  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: "site_theme.updated",
    resourceType: "site",
    resourceId: theme.siteId,
    metadata: {
      primaryColor: theme.primaryColor,
      fontKey: theme.fontKey,
      radiusKey: theme.radiusKey,
    },
  });
}

export async function getSiteHeroUseCase(
  actor: VerifiedUser | null,
  siteId: string,
  repo: HeroRepository,
): Promise<SiteHero | null> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  return repo.getHero(siteId);
}

export async function saveSiteHeroUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  hero: SiteHero,
  actorRole: TenantRole,
  repo: HeroRepository,
  audit: AuditLogGateway,
): Promise<void> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  if (!canEditContent(actorRole)) {
    throw new SiteAuthorizationError("Insufficient permissions to update site hero.");
  }

  const headline = hero.headline.trim();
  const subheadline = hero.subheadline.trim();
  const ctaText = hero.ctaText.trim();
  const ctaLink = hero.ctaLink.trim();

  if (headline.length === 0 || headline.length > 160) {
    throw new InvalidHeroError("Headline must be between 1 and 160 characters.");
  }
  if (subheadline.length === 0 || subheadline.length > 320) {
    throw new InvalidHeroError("Subheadline must be between 1 and 320 characters.");
  }
  if (ctaText.length === 0 || ctaText.length > 40) {
    throw new InvalidHeroError("CTA text must be between 1 and 40 characters.");
  }
  if (!isSafeLink(ctaLink)) {
    throw new InvalidHeroError("CTA link must be a valid safe URL or path.");
  }

  await repo.saveHero({
    siteId: hero.siteId,
    headline,
    subheadline,
    ctaText,
    ctaLink,
    badgeText: hero.badgeText ? hero.badgeText.trim() : undefined,
  });

  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: "site_hero.updated",
    resourceType: "site",
    resourceId: hero.siteId,
    metadata: {
      headline,
      ctaLink,
    },
  });
}
