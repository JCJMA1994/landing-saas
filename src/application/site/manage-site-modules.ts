import type { VerifiedUser } from "../auth/admin-access";
import { canEditContent, type TenantRole } from "../../domain/tenant/roles";
import { SiteAuthorizationError } from "./manage-site-content";
import { isValidCardLink, type SiteCard } from "../../domain/site/card";
import { isPromotionDateValid, type SitePromotion } from "../../domain/site/promotion";
import { isValidE164Phone, isValidInstagramHandle, type SiteContacts } from "../../domain/site/contact";
import type { CardRepository } from "./card-repository";
import type { PromotionRepository } from "./promotion-repository";
import type { ContactRepository } from "./contact-repository";
import type { AuditLogGateway } from "../audit/audit-gateway";

export class InvalidModuleDataError extends Error {
  constructor(message = "Invalid module content provided.") {
    super(message);
    this.name = "InvalidModuleDataError";
  }
}

// Cards
export async function listCardsUseCase(
  actor: VerifiedUser | null,
  siteId: string,
  repo: CardRepository,
): Promise<SiteCard[]> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  return repo.listCards(siteId);
}

export async function saveCardUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  card: SiteCard,
  actorRole: TenantRole,
  repo: CardRepository,
  audit: AuditLogGateway,
): Promise<void> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  if (!canEditContent(actorRole)) {
    throw new SiteAuthorizationError("Insufficient permissions to manage cards.");
  }

  const title = card.title.trim();
  const description = card.description.trim();
  if (title.length === 0 || title.length > 80) {
    throw new InvalidModuleDataError("Card title must be between 1 and 80 characters.");
  }
  if (description.length === 0 || description.length > 300) {
    throw new InvalidModuleDataError("Card description must be between 1 and 300 characters.");
  }
  if (!isValidCardLink(card.linkUrl)) {
    throw new InvalidModuleDataError("Card link must be a safe URL or path.");
  }

  await repo.saveCard({
    ...card,
    title,
    description,
    badge: card.badge ? card.badge.trim() : undefined,
    linkUrl: card.linkUrl ? card.linkUrl.trim() : undefined,
  });

  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: card.id ? "card.updated" : "card.created",
    resourceType: "site_card",
    resourceId: card.id ?? card.siteId,
    metadata: { title, iconKey: card.iconKey },
  });
}

export async function deleteCardUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  siteId: string,
  cardId: string,
  actorRole: TenantRole,
  repo: CardRepository,
  audit: AuditLogGateway,
): Promise<void> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  if (!canEditContent(actorRole)) {
    throw new SiteAuthorizationError("Insufficient permissions to delete cards.");
  }

  await repo.deleteCard(siteId, cardId);
  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: "card.deleted",
    resourceType: "site_card",
    resourceId: cardId,
  });
}

// Promotions
export async function listPromotionsUseCase(
  actor: VerifiedUser | null,
  siteId: string,
  repo: PromotionRepository,
): Promise<SitePromotion[]> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  return repo.listPromotions(siteId);
}

export async function savePromotionUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  promotion: SitePromotion,
  actorRole: TenantRole,
  repo: PromotionRepository,
  audit: AuditLogGateway,
): Promise<void> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  if (!canEditContent(actorRole)) {
    throw new SiteAuthorizationError("Insufficient permissions to manage promotions.");
  }

  const title = promotion.title.trim();
  const description = promotion.description.trim();
  if (title.length === 0 || title.length > 100) {
    throw new InvalidModuleDataError("Promotion title must be between 1 and 100 characters.");
  }
  if (description.length === 0 || description.length > 400) {
    throw new InvalidModuleDataError("Promotion description must be between 1 and 400 characters.");
  }
  if (!isPromotionDateValid(promotion.startsAt, promotion.endsAt)) {
    throw new InvalidModuleDataError("Promotion end date must be after start date.");
  }

  await repo.savePromotion({
    ...promotion,
    title,
    description,
    discountLabel: promotion.discountLabel ? promotion.discountLabel.trim() : undefined,
    couponCode: promotion.couponCode ? promotion.couponCode.trim() : undefined,
  });

  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: promotion.id ? "promotion.updated" : "promotion.created",
    resourceType: "site_promotion",
    resourceId: promotion.id ?? promotion.siteId,
    metadata: { title, isActive: promotion.isActive },
  });
}

export async function deletePromotionUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  siteId: string,
  promotionId: string,
  actorRole: TenantRole,
  repo: PromotionRepository,
  audit: AuditLogGateway,
): Promise<void> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  if (!canEditContent(actorRole)) {
    throw new SiteAuthorizationError("Insufficient permissions to delete promotions.");
  }

  await repo.deletePromotion(siteId, promotionId);
  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: "promotion.deleted",
    resourceType: "site_promotion",
    resourceId: promotionId,
  });
}

// Contacts
export async function getContactsUseCase(
  actor: VerifiedUser | null,
  siteId: string,
  repo: ContactRepository,
): Promise<SiteContacts | null> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  return repo.getContacts(siteId);
}

export async function saveContactsUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  contacts: SiteContacts,
  actorRole: TenantRole,
  repo: ContactRepository,
  audit: AuditLogGateway,
): Promise<void> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  if (!canEditContent(actorRole)) {
    throw new SiteAuthorizationError("Insufficient permissions to update contacts.");
  }

  if (contacts.whatsappNumber && !isValidE164Phone(contacts.whatsappNumber)) {
    throw new InvalidModuleDataError("WhatsApp number must follow international E.164 format (+1234567890).");
  }
  if (contacts.instagramHandle && !isValidInstagramHandle(contacts.instagramHandle)) {
    throw new InvalidModuleDataError("Instagram handle contains invalid characters.");
  }

  await repo.saveContacts(contacts);

  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: "contacts.updated",
    resourceType: "site_contacts",
    resourceId: contacts.siteId,
    metadata: {
      hasWhatsApp: Boolean(contacts.whatsappNumber),
      hasInstagram: Boolean(contacts.instagramHandle),
    },
  });
}
