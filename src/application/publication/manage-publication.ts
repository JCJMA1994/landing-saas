import type { User } from "@supabase/supabase-js";
import type { AuditLogGateway } from "../audit/audit-gateway";
import type { PublicationRepository } from "./publication-repository";
import type { ThemeRepository } from "../site/theme-repository";
import type { HeroRepository } from "../site/hero-repository";
import type { CardRepository } from "../site/card-repository";
import type { PromotionRepository } from "../site/promotion-repository";
import type { ContactRepository } from "../site/contact-repository";
import { canEditContent, type TenantRole } from "../../domain/tenant/roles";
import {
  calculateSnapshotChecksum,
  createPublicationSnapshot,
  type PublicationSnapshot,
} from "../../domain/publication/snapshot";
import {
  prepareRollbackSnapshot,
  type SitePublication,
} from "../../domain/publication/publication";
import { DEFAULT_SITE_THEME } from "../../domain/site/theme";
import type { TemplateKey } from "../../domain/template/manifest";

import type { CdnInvalidationGateway } from "../scale/cdn-gateway";

export class PublicationAuthorizationError extends Error {
  constructor() {
    super("Insufficient permissions to publish or rollback this site.");
    this.name = "PublicationAuthorizationError";
  }
}

export class PublicationNotFoundError extends Error {
  constructor(message = "Publication record not found.") {
    super(message);
    this.name = "PublicationNotFoundError";
  }
}

export interface SiteMetaInfo {
  id: string;
  name: string;
  slug: string;
  templateKey: TemplateKey;
}

export async function publishSiteUseCase(
  actor: User,
  tenantId: string,
  siteMeta: SiteMetaInfo,
  role: TenantRole,
  themeRepo: ThemeRepository,
  heroRepo: HeroRepository,
  cardRepo: CardRepository,
  promoRepo: PromotionRepository,
  contactRepo: ContactRepository,
  publicationRepo: PublicationRepository,
  auditGateway: AuditLogGateway,
  cdnGateway?: CdnInvalidationGateway | undefined
): Promise<SitePublication> {
  if (!canEditContent(role)) {
    throw new PublicationAuthorizationError();
  }

  const [existingTheme, hero, cards, promotions, contacts] = await Promise.all([
    themeRepo.getTheme(siteMeta.id),
    heroRepo.getHero(siteMeta.id),
    cardRepo.listCards(siteMeta.id),
    promoRepo.listPromotions(siteMeta.id),
    contactRepo.getContacts(siteMeta.id),
  ]);

  const theme = existingTheme || {
    ...DEFAULT_SITE_THEME,
    siteId: siteMeta.id,
  };

  const snapshot: PublicationSnapshot = createPublicationSnapshot({
    siteId: siteMeta.id,
    siteName: siteMeta.name,
    siteSlug: siteMeta.slug,
    templateKey: siteMeta.templateKey,
    theme,
    hero,
    cards,
    promotions,
    contacts,
  });

  const checksum = await calculateSnapshotChecksum(snapshot);

  const publication = await publicationRepo.publishSnapshot(
    siteMeta.id,
    snapshot,
    checksum,
    actor.id
  );

  await auditGateway.record({
    tenantId,
    actorUserId: actor.id,
    action: "site.published",
    resourceType: "site_publication",
    resourceId: publication.id,
    metadata: {
      siteId: siteMeta.id,
      version: publication.version,
      checksum: publication.checksum,
      templateKey: siteMeta.templateKey,
    },
  });

  if (cdnGateway) {
    try {
      await cdnGateway.purgeSite({
        siteId: siteMeta.id,
        tenantId,
        paths: [`/sites/${siteMeta.slug}`, "/"],
      });
    } catch {
      // Non-blocking CDN cache invalidation
    }
  }

  return publication;
}

export async function rollbackSiteUseCase(
  actor: User,
  tenantId: string,
  siteId: string,
  targetVersion: number,
  role: TenantRole,
  publicationRepo: PublicationRepository,
  auditGateway: AuditLogGateway,
  cdnGateway?: CdnInvalidationGateway | undefined
): Promise<SitePublication> {
  if (!canEditContent(role)) {
    throw new PublicationAuthorizationError();
  }

  const targetPub = await publicationRepo.getPublicationByVersion(siteId, targetVersion);
  if (!targetPub) {
    throw new PublicationNotFoundError(`Publication with version ${targetVersion} was not found.`);
  }

  // Rollback produces an immutable new version with current timestamp (skills/publishing.skill.md)
  const newSnapshot = prepareRollbackSnapshot(targetPub);
  const checksum = await calculateSnapshotChecksum(newSnapshot);

  const newPublication = await publicationRepo.publishSnapshot(
    siteId,
    newSnapshot,
    checksum,
    actor.id
  );

  await auditGateway.record({
    tenantId,
    actorUserId: actor.id,
    action: "site.rolled_back",
    resourceType: "site_publication",
    resourceId: newPublication.id,
    metadata: {
      siteId,
      newVersion: newPublication.version,
      rolledBackFromVersion: targetVersion,
      checksum: newPublication.checksum,
    },
  });

  if (cdnGateway) {
    try {
      await cdnGateway.purgeSite({
        siteId,
        tenantId,
        paths: ["/"],
      });
    } catch {
      // Non-blocking CDN cache invalidation
    }
  }

  return newPublication;
}
