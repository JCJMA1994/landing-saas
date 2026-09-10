import { describe, expect, it, vi } from "vitest";
import {
  deleteCardUseCase,
  deletePromotionUseCase,
  getContactsUseCase,
  listCardsUseCase,
  listPromotionsUseCase,
  saveCardUseCase,
  saveContactsUseCase,
  savePromotionUseCase,
  InvalidModuleDataError,
} from "../../src/application/site/manage-site-modules";
import { SiteAuthorizationError } from "../../src/application/site/manage-site-content";
import type { CardRepository } from "../../src/application/site/card-repository";
import type { PromotionRepository } from "../../src/application/site/promotion-repository";
import type { ContactRepository } from "../../src/application/site/contact-repository";
import type { AuditLogGateway } from "../../src/application/audit/audit-gateway";
import type { SiteCard } from "../../src/domain/site/card";
import type { SitePromotion } from "../../src/domain/site/promotion";
import type { SiteContacts } from "../../src/domain/site/contact";

const mockSiteId = "20000000-0000-0000-0000-000000000002";
const mockTenantId = "10000000-0000-0000-0000-000000000002";
const editorUser = { id: "00000000-0000-0000-0000-000000000001" };

function createMockCardRepo(): CardRepository {
  return {
    listCards: vi.fn().mockResolvedValue([]),
    saveCard: vi.fn().mockResolvedValue(undefined),
    deleteCard: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockPromoRepo(): PromotionRepository {
  return {
    listPromotions: vi.fn().mockResolvedValue([]),
    savePromotion: vi.fn().mockResolvedValue(undefined),
    deletePromotion: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockContactRepo(): ContactRepository {
  return {
    getContacts: vi.fn().mockResolvedValue(null),
    saveContacts: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockAudit(): AuditLogGateway {
  return {
    record: vi.fn().mockResolvedValue(undefined),
    listRecent: vi.fn().mockResolvedValue([]),
  };
}

describe("manage site modules use cases", () => {
  describe("cards", () => {
    const card: SiteCard = {
      siteId: mockSiteId,
      title: "Real-time Metrics",
      description: "Low-latency streaming analytics engine.",
      iconKey: "chart",
      sortOrder: 1,
    };

    it("rejects unauthenticated listCards", async () => {
      const repo = createMockCardRepo();
      await expect(listCardsUseCase(null, mockSiteId, repo)).rejects.toThrow(SiteAuthorizationError);
    });

    it("prevents viewers from saving cards", async () => {
      const repo = createMockCardRepo();
      const audit = createMockAudit();
      await expect(
        saveCardUseCase(editorUser, mockTenantId, card, "viewer", repo, audit),
      ).rejects.toThrow(SiteAuthorizationError);
    });

    it("saves valid card and writes audit log", async () => {
      const repo = createMockCardRepo();
      const audit = createMockAudit();
      await saveCardUseCase(editorUser, mockTenantId, card, "editor", repo, audit);

      expect(repo.saveCard).toHaveBeenCalledWith(expect.objectContaining({ title: "Real-time Metrics" }));
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          action: "card.created",
        }),
      );
    });

    it("deletes card and writes audit log", async () => {
      const repo = createMockCardRepo();
      const audit = createMockAudit();
      await deleteCardUseCase(editorUser, mockTenantId, mockSiteId, "card-123", "admin", repo, audit);

      expect(repo.deleteCard).toHaveBeenCalledWith(mockSiteId, "card-123");
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          action: "card.deleted",
          resourceId: "card-123",
        }),
      );
    });
  });

  describe("promotions", () => {
    const promo: SitePromotion = {
      siteId: mockSiteId,
      title: "Launch Promo",
      description: "Special opening discount.",
      isActive: true,
      startsAt: "2026-09-01T00:00:00Z",
      endsAt: "2026-09-15T00:00:00Z",
    };

    it("fetches promotions for authenticated user", async () => {
      const repo = createMockPromoRepo();
      await listPromotionsUseCase(editorUser, mockSiteId, repo);
      expect(repo.listPromotions).toHaveBeenCalledWith(mockSiteId);
    });

    it("rejects saving promotion with inverted dates", async () => {
      const repo = createMockPromoRepo();
      const audit = createMockAudit();
      const invalid = { ...promo, startsAt: "2026-09-20T00:00:00Z", endsAt: "2026-09-10T00:00:00Z" };

      await expect(
        savePromotionUseCase(editorUser, mockTenantId, invalid, "editor", repo, audit),
      ).rejects.toThrow(InvalidModuleDataError);
    });

    it("saves valid promotion and logs audit event", async () => {
      const repo = createMockPromoRepo();
      const audit = createMockAudit();
      await savePromotionUseCase(editorUser, mockTenantId, promo, "editor", repo, audit);

      expect(repo.savePromotion).toHaveBeenCalledWith(expect.objectContaining({ title: "Launch Promo" }));
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          action: "promotion.created",
        }),
      );
    });

    it("deletes promotion and writes audit log", async () => {
      const repo = createMockPromoRepo();
      const audit = createMockAudit();
      await deletePromotionUseCase(editorUser, mockTenantId, mockSiteId, "promo-1", "admin", repo, audit);

      expect(repo.deletePromotion).toHaveBeenCalledWith(mockSiteId, "promo-1");
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          action: "promotion.deleted",
          resourceId: "promo-1",
        }),
      );
    });
  });

  describe("contacts", () => {
    const contacts: SiteContacts = {
      siteId: mockSiteId,
      whatsappNumber: "+5491122334455",
      instagramHandle: "saas_pro",
    };

    it("retrieves contacts for authenticated user", async () => {
      const repo = createMockContactRepo();
      await getContactsUseCase(editorUser, mockSiteId, repo);
      expect(repo.getContacts).toHaveBeenCalledWith(mockSiteId);
    });

    it("rejects non-E164 phone numbers", async () => {
      const repo = createMockContactRepo();
      const audit = createMockAudit();
      const invalid = { ...contacts, whatsappNumber: "123456" };

      await expect(
        saveContactsUseCase(editorUser, mockTenantId, invalid, "editor", repo, audit),
      ).rejects.toThrow(InvalidModuleDataError);
    });

    it("saves valid contacts and logs audit event", async () => {
      const repo = createMockContactRepo();
      const audit = createMockAudit();
      await saveContactsUseCase(editorUser, mockTenantId, contacts, "editor", repo, audit);

      expect(repo.saveContacts).toHaveBeenCalledWith(contacts);
      expect(audit.record).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: mockTenantId,
          action: "contacts.updated",
        }),
      );
    });
  });
});
