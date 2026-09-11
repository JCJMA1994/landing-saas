import { defineAction } from "astro:actions";
import { z } from "astro/zod";
import { loginWithPassword, logoutLocally } from "../application/auth/session";
import {
  assignMemberUseCase,
  removeMemberUseCase,
  MemberAuthorizationError,
  LastOwnerProtectionError,
} from "../application/members/manage-members";
import {
  saveSiteThemeUseCase,
  saveSiteHeroUseCase,
  SiteAuthorizationError,
  InvalidThemeError,
  InvalidHeroError,
} from "../application/site/manage-site-content";
import {
  saveCardUseCase,
  deleteCardUseCase,
  savePromotionUseCase,
  deletePromotionUseCase,
  saveContactsUseCase,
  InvalidModuleDataError,
} from "../application/site/manage-site-modules";
import { SupabaseMemberRepository } from "../infrastructure/supabase/member-repository";
import { SupabaseAuditGateway } from "../infrastructure/supabase/audit-gateway";
import { SupabaseThemeRepository } from "../infrastructure/supabase/theme-repository";
import { SupabaseHeroRepository } from "../infrastructure/supabase/hero-repository";
import { SupabaseCardRepository } from "../infrastructure/supabase/card-repository";
import { SupabasePromotionRepository } from "../infrastructure/supabase/promotion-repository";
import { SupabaseContactRepository } from "../infrastructure/supabase/contact-repository";
import {
  uploadMediaAssetUseCase,
  deleteMediaAssetUseCase,
  InvalidMediaError,
} from "../application/site/manage-media-assets";
import { SupabaseMediaRepository } from "../infrastructure/supabase/media-repository";
import { SupabaseStorageGateway } from "../infrastructure/supabase/storage-gateway";
import { isTenantRole, TENANT_ROLES, type TenantRole, canEditContent } from "../domain/tenant/roles";
import {
  THEME_BUTTON_VARIANTS,
  THEME_CARD_VARIANTS,
  THEME_FONTS,
  THEME_RADII,
} from "../domain/site/theme";
import { ALLOWED_CARD_ICONS } from "../domain/site/card";
import { TEMPLATE_KEYS, isTemplateKey, type TemplateKey } from "../domain/template/manifest";
import {
  publishSiteUseCase,
  rollbackSiteUseCase,
  PublicationAuthorizationError,
  PublicationNotFoundError,
} from "../application/publication/manage-publication";
import { SupabasePublicationRepository } from "../infrastructure/supabase/publication-repository";
import {
  CAMPAIGN_PRESETS,
  CAMPAIGN_INTENSITIES,
  CAMPAIGN_STATUSES,
  InvalidCampaignError,
} from "../domain/campaign/campaign";
import {
  saveCampaignUseCase,
  deleteCampaignUseCase,
  CampaignAuthorizationError,
  CampaignNotFoundError,
} from "../application/campaign/manage-campaigns";
import { SupabaseCampaignRepository } from "../infrastructure/supabase/campaign-repository";
import { switchSiteTemplateUseCase } from "../application/template/manage-template-registry";
import {
  addSiteDomainUseCase,
  verifySiteDomainUseCase,
  deleteSiteDomainUseCase,
  DomainAuthorizationError,
  InvalidDomainError,
  DomainAlreadyRegisteredError,
  DomainNotFoundError,
} from "../application/domain/manage-domains";
import { SupabaseDomainRepository } from "../infrastructure/supabase/domain-repository";
import { NodeDnsGateway } from "../infrastructure/dns/node-dns-gateway";
import { parseServerEnv } from "../infrastructure/config/env";
import { createAdminClient } from "../infrastructure/supabase/server";
import {
  changeTenantPlanUseCase,
  enforceTenantQuotaUseCase,
  checkTenantFeatureFlagUseCase,
  SubscriptionAuthorizationError,
  InvalidPlanError,
} from "../application/saas/manage-subscription";
import {
  onboardClientUseCase,
  OnboardingValidationError,
  SlugAlreadyTakenError,
} from "../application/saas/onboard-client";
import { SupabaseClientOnboardingGateway } from "../infrastructure/supabase/supabase-client-onboarding-gateway";
import { PLAN_IDS } from "../domain/saas/plan";
import { SupabaseSubscriptionRepository } from "../infrastructure/supabase/subscription-repository";
import { MockBillingGateway } from "../infrastructure/billing/mock-billing-gateway";
import { QuotaExceededError } from "../domain/saas/quota";
import { FeatureNotAllowedError } from "../domain/saas/feature-flag";
import { SupabasePaletteRepository } from "../infrastructure/supabase/palette-repository";

async function verifyTenantRole(supabase: any, tenantId: string, userId: string): Promise<TenantRole | null> {
  const { data } = await supabase
    .from("tenant_members")
    .select("role")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  return data && isTenantRole(data.role) ? data.role : null;
}

export const server = {
  login: defineAction({
    accept: "form",
    input: z.object({
      email: z.email().trim().max(254),
      password: z.string().min(8).max(128),
    }),
    handler: async ({ email, password }, context) =>
      loginWithPassword(context.locals.supabase.auth, email, password),
  }),
  logout: defineAction({
    accept: "form",
    handler: async (_input, context) =>
      logoutLocally(context.locals.supabase.auth, context.locals.user),
  }),
  assignMember: defineAction({
    accept: "form",
    input: z.object({
      tenantId: z.uuid(),
      userId: z.uuid(),
      role: z.enum(TENANT_ROLES),
    }),
    handler: async ({ tenantId, userId, role }, context) => {
      if (!context.locals.user) {
        return { ok: false, error: "Authentication required." };
      }
      const memberRepo = new SupabaseMemberRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        await assignMemberUseCase(
          context.locals.user,
          tenantId,
          userId,
          role,
          memberRepo,
          auditGateway,
        );
        return { ok: true };
      } catch (error) {
        if (error instanceof MemberAuthorizationError || error instanceof LastOwnerProtectionError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: "Unable to update member. Please try again." };
      }
    },
  }),
  removeMember: defineAction({
    accept: "form",
    input: z.object({
      tenantId: z.uuid(),
      userId: z.uuid(),
    }),
    handler: async ({ tenantId, userId }, context) => {
      if (!context.locals.user) {
        return { ok: false, error: "Authentication required." };
      }
      const memberRepo = new SupabaseMemberRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        await removeMemberUseCase(
          context.locals.user,
          tenantId,
          userId,
          memberRepo,
          auditGateway,
        );
        return { ok: true };
      } catch (error) {
        if (error instanceof MemberAuthorizationError || error instanceof LastOwnerProtectionError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: "Unable to remove member. Please try again." };
      }
    },
  }),
  saveSiteTheme: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.uuid(),
      tenantId: z.uuid(),
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      fontKey: z.enum(THEME_FONTS),
      radiusKey: z.enum(THEME_RADII),
      buttonVariant: z.enum(THEME_BUTTON_VARIANTS),
      cardVariant: z.enum(THEME_CARD_VARIANTS),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, input.tenantId, context.locals.user.id);
      if (!role) return { ok: false, error: "Insufficient permissions for this tenant." };

      const themeRepo = new SupabaseThemeRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        await saveSiteThemeUseCase(
          context.locals.user,
          input.tenantId,
          input,
          role,
          themeRepo,
          auditGateway,
        );
        return { ok: true };
      } catch (error) {
        if (error instanceof SiteAuthorizationError || error instanceof InvalidThemeError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: "Unable to save theme. Please try again." };
      }
    },
  }),
  saveSiteHero: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.uuid(),
      tenantId: z.uuid(),
      headline: z.string().trim().min(1).max(160),
      subheadline: z.string().trim().min(1).max(320),
      ctaText: z.string().trim().min(1).max(40),
      ctaLink: z.string().trim().min(1).max(256),
      badgeText: z.string().trim().max(60).optional(),
      imageUrl: z.string().trim().max(512).optional(),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, input.tenantId, context.locals.user.id);
      if (!role) return { ok: false, error: "Insufficient permissions for this tenant." };

      const heroRepo = new SupabaseHeroRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        await saveSiteHeroUseCase(
          context.locals.user,
          input.tenantId,
          input,
          role,
          heroRepo,
          auditGateway,
        );
        return { ok: true };
      } catch (error) {
        if (error instanceof SiteAuthorizationError || error instanceof InvalidHeroError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: "Unable to save hero. Please try again." };
      }
    },
  }),
  saveSiteCard: defineAction({
    accept: "form",
    input: z.object({
      id: z.uuid().optional(),
      siteId: z.uuid(),
      tenantId: z.uuid(),
      title: z.string().trim().min(1).max(80),
      description: z.string().trim().min(1).max(300),
      iconKey: z.enum(ALLOWED_CARD_ICONS),
      badge: z.string().trim().max(40).optional(),
      linkUrl: z.string().trim().max(256).optional(),
      sortOrder: z.coerce.number().int().min(0).default(0),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, input.tenantId, context.locals.user.id);
      if (!role) return { ok: false, error: "Insufficient permissions for this tenant." };

      const cardRepo = new SupabaseCardRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        await saveCardUseCase(
          context.locals.user,
          input.tenantId,
          input,
          role,
          cardRepo,
          auditGateway,
        );
        return { ok: true };
      } catch (error) {
        if (error instanceof SiteAuthorizationError || error instanceof InvalidModuleDataError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: "Unable to save card. Please try again." };
      }
    },
  }),
  deleteSiteCard: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.uuid(),
      tenantId: z.uuid(),
      cardId: z.uuid(),
    }),
    handler: async ({ siteId, tenantId, cardId }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role) return { ok: false, error: "Insufficient permissions for this tenant." };

      const cardRepo = new SupabaseCardRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        await deleteCardUseCase(context.locals.user, tenantId, siteId, cardId, role, cardRepo, auditGateway);
        return { ok: true };
      } catch (error) {
        if (error instanceof SiteAuthorizationError) return { ok: false, error: error.message };
        return { ok: false, error: "Unable to delete card. Please try again." };
      }
    },
  }),
  saveSitePromotion: defineAction({
    accept: "form",
    input: z.object({
      id: z.uuid().optional(),
      siteId: z.uuid(),
      tenantId: z.uuid(),
      title: z.string().trim().min(1).max(100),
      description: z.string().trim().min(1).max(400),
      discountLabel: z.string().trim().max(30).optional(),
      couponCode: z.string().trim().max(30).optional(),
      startsAt: z.string().optional(),
      endsAt: z.string().optional(),
      isActive: z.coerce.boolean().default(true),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, input.tenantId, context.locals.user.id);
      if (!role) return { ok: false, error: "Insufficient permissions for this tenant." };

      const promoRepo = new SupabasePromotionRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        await savePromotionUseCase(
          context.locals.user,
          input.tenantId,
          input,
          role,
          promoRepo,
          auditGateway,
        );
        return { ok: true };
      } catch (error) {
        if (error instanceof SiteAuthorizationError || error instanceof InvalidModuleDataError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: "Unable to save promotion. Please try again." };
      }
    },
  }),
  deleteSitePromotion: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.uuid(),
      tenantId: z.uuid(),
      promotionId: z.uuid(),
    }),
    handler: async ({ siteId, tenantId, promotionId }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role) return { ok: false, error: "Insufficient permissions for this tenant." };

      const promoRepo = new SupabasePromotionRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        await deletePromotionUseCase(context.locals.user, tenantId, siteId, promotionId, role, promoRepo, auditGateway);
        return { ok: true };
      } catch (error) {
        if (error instanceof SiteAuthorizationError) return { ok: false, error: error.message };
        return { ok: false, error: "Unable to delete promotion. Please try again." };
      }
    },
  }),
  saveSiteContacts: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.uuid(),
      tenantId: z.uuid(),
      whatsappNumber: z.string().trim().max(20).optional(),
      whatsappMessage: z.string().trim().max(140).optional(),
      instagramHandle: z.string().trim().max(30).optional(),
      facebookUrl: z.string().trim().max(256).optional(),
      email: z.string().trim().max(254).optional(),
      phone: z.string().trim().max(30).optional(),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, input.tenantId, context.locals.user.id);
      if (!role) return { ok: false, error: "Insufficient permissions for this tenant." };

      const contactRepo = new SupabaseContactRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        await saveContactsUseCase(
          context.locals.user,
          input.tenantId,
          {
            siteId: input.siteId,
            whatsappNumber: input.whatsappNumber || undefined,
            whatsappMessage: input.whatsappMessage || undefined,
            instagramHandle: input.instagramHandle || undefined,
            facebookUrl: input.facebookUrl || undefined,
            email: input.email || undefined,
            phone: input.phone || undefined,
          },
          role,
          contactRepo,
          auditGateway,
        );
        return { ok: true };
      } catch (error) {
        if (error instanceof SiteAuthorizationError || error instanceof InvalidModuleDataError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: "Unable to save contacts. Please try again." };
      }
    },
  }),
  uploadMediaAsset: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.uuid(),
      tenantId: z.uuid(),
      altText: z.string().trim().min(1).max(160),
      file: z.instanceof(File),
    }),
    handler: async ({ siteId, tenantId, altText, file }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role) return { ok: false, error: "Insufficient permissions for this tenant." };

      const mediaRepo = new SupabaseMediaRepository(context.locals.supabase);
      const storageGateway = new SupabaseStorageGateway(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        const arrayBuffer = await file.arrayBuffer();
        await uploadMediaAssetUseCase(
          context.locals.user,
          tenantId,
          siteId,
          {
            filename: file.name,
            mimeType: file.type,
            data: new Uint8Array(arrayBuffer),
            altText,
          },
          role,
          mediaRepo,
          storageGateway,
          auditGateway,
        );
        return { ok: true };
      } catch (error) {
        if (error instanceof SiteAuthorizationError || error instanceof InvalidMediaError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: "Unable to upload media. Please try again." };
      }
    },
  }),
  deleteMediaAsset: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.uuid(),
      tenantId: z.uuid(),
      assetId: z.uuid(),
    }),
    handler: async ({ siteId, tenantId, assetId }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role) return { ok: false, error: "Insufficient permissions for this tenant." };

      const mediaRepo = new SupabaseMediaRepository(context.locals.supabase);
      const storageGateway = new SupabaseStorageGateway(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      try {
        await deleteMediaAssetUseCase(
          context.locals.user,
          tenantId,
          siteId,
          assetId,
          role,
          mediaRepo,
          storageGateway,
          auditGateway,
        );
        return { ok: true };
      } catch (error) {
        if (error instanceof SiteAuthorizationError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: "Unable to delete media. Please try again." };
      }
    },
  }),
  saveSiteTemplate: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.uuid(),
      tenantId: z.uuid(),
      templateKey: z.enum(TEMPLATE_KEYS),
      applySuggestedVariants: z.preprocess((val) => val === "true" || val === "on" || val === true, z.boolean()).optional(),
    }),
    handler: async ({ siteId, tenantId, templateKey, applySuggestedVariants }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role || !canEditContent(role)) {
        return { ok: false, error: "Insufficient permissions to update site template." };
      }

      const themeRepo = new SupabaseThemeRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);

      try {
        const result = await switchSiteTemplateUseCase(
          context.locals.user,
          tenantId,
          siteId,
          templateKey,
          role,
          context.locals.supabase,
          themeRepo,
          auditGateway,
          { applySuggestedVariants: Boolean(applySuggestedVariants) }
        );

        return { ok: true, report: result.report };
      } catch (error: any) {
        return { ok: false, error: error?.message || "Failed to switch site template." };
      }
    },
  }),
  publishSite: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.uuid(),
      tenantId: z.uuid(),
    }),
    handler: async ({ siteId, tenantId }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role || !canEditContent(role)) {
        return { ok: false, error: "Insufficient permissions to publish this site." };
      }

      const { data: siteData, error: siteError } = await context.locals.supabase
        .from("sites")
        .select("id, name, slug, template_key")
        .eq("id", siteId)
        .eq("tenant_id", tenantId)
        .maybeSingle();

      if (siteError || !siteData) {
        return { ok: false, error: "Site not found." };
      }

      const templateKey = isTemplateKey(siteData.template_key)
        ? (siteData.template_key as TemplateKey)
        : "tech-diagnostic";

      const themeRepo = new SupabaseThemeRepository(context.locals.supabase);
      const heroRepo = new SupabaseHeroRepository(context.locals.supabase);
      const cardRepo = new SupabaseCardRepository(context.locals.supabase);
      const promoRepo = new SupabasePromotionRepository(context.locals.supabase);
      const contactRepo = new SupabaseContactRepository(context.locals.supabase);
      const publicationRepo = new SupabasePublicationRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);

      try {
        const publication = await publishSiteUseCase(
          context.locals.user,
          tenantId,
          {
            id: siteData.id,
            name: siteData.name,
            slug: siteData.slug,
            templateKey,
          },
          role,
          themeRepo,
          heroRepo,
          cardRepo,
          promoRepo,
          contactRepo,
          publicationRepo,
          auditGateway
        );

        return { ok: true, version: publication.version, checksum: publication.checksum };
      } catch (error: any) {
        if (error instanceof PublicationAuthorizationError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: error?.message || "Failed to publish site snapshot." };
      }
    },
  }),
  rollbackSite: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.uuid(),
      tenantId: z.uuid(),
      targetVersion: z.coerce.number().int().positive(),
    }),
    handler: async ({ siteId, tenantId, targetVersion }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role || !canEditContent(role)) {
        return { ok: false, error: "Insufficient permissions to rollback this site." };
      }

      const publicationRepo = new SupabasePublicationRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);

      try {
        const publication = await rollbackSiteUseCase(
          context.locals.user,
          tenantId,
          siteId,
          targetVersion,
          role,
          publicationRepo,
          auditGateway
        );

        return { ok: true, version: publication.version, checksum: publication.checksum };
      } catch (error: any) {
        if (error instanceof PublicationAuthorizationError || error instanceof PublicationNotFoundError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: error?.message || "Failed to rollback site." };
      }
    },
  }),
  saveCampaign: defineAction({
    accept: "form",
    input: z.object({
      id: z.uuid().optional(),
      siteId: z.uuid(),
      tenantId: z.uuid(),
      name: z.string().min(1).max(100),
      preset: z.enum(CAMPAIGN_PRESETS),
      intensity: z.enum(CAMPAIGN_INTENSITIES),
      status: z.enum(CAMPAIGN_STATUSES),
      priority: z.coerce.number().int().default(0),
      startsAt: z.string().min(1),
      endsAt: z.string().min(1),
      bannerText: z.string().max(200).optional().nullable(),
      bannerLink: z.string().max(300).optional().nullable(),
      badgeText: z.string().max(50).optional().nullable(),
      accentColor: z.string().max(20).optional().nullable(),
      showCountdown: z.preprocess((val) => val === "true" || val === "on" || val === true, z.boolean()),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, input.tenantId, context.locals.user.id);
      if (!role || !canEditContent(role)) {
        return { ok: false, error: "Insufficient permissions to manage campaigns." };
      }

      const campaignRepo = new SupabaseCampaignRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      const subRepo = new SupabaseSubscriptionRepository(context.locals.supabase);

      try {
        if (!input.id) {
          await checkTenantFeatureFlagUseCase({ tenantId: input.tenantId, feature: "campaigns", repository: subRepo });
          await enforceTenantQuotaUseCase({ tenantId: input.tenantId, resource: "campaigns", repository: subRepo });
        }

        const saved = await saveCampaignUseCase(
          context.locals.user,
          input.tenantId,
          {
            id: input.id,
            siteId: input.siteId,
            name: input.name,
            preset: input.preset,
            intensity: input.intensity,
            status: input.status,
            priority: input.priority,
            startsAt: input.startsAt,
            endsAt: input.endsAt,
            bannerText: input.bannerText,
            bannerLink: input.bannerLink,
            badgeText: input.badgeText,
            accentColor: input.accentColor,
            showCountdown: input.showCountdown,
          },
          role,
          campaignRepo,
          auditGateway
        );

        return { ok: true, campaign: saved };
      } catch (error: any) {
        if (error instanceof CampaignAuthorizationError || error instanceof InvalidCampaignError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: error?.message || "Failed to save campaign." };
      }
    },
  }),
  deleteCampaign: defineAction({
    accept: "form",
    input: z.object({
      id: z.uuid(),
      siteId: z.uuid(),
      tenantId: z.uuid(),
    }),
    handler: async ({ id, siteId, tenantId }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role || !canEditContent(role)) {
        return { ok: false, error: "Insufficient permissions to delete campaign." };
      }

      const campaignRepo = new SupabaseCampaignRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);

      try {
        await deleteCampaignUseCase(
          context.locals.user,
          tenantId,
          siteId,
          id,
          role,
          campaignRepo,
          auditGateway
        );

        return { ok: true };
      } catch (error: any) {
        if (error instanceof CampaignAuthorizationError || error instanceof CampaignNotFoundError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: error?.message || "Failed to delete campaign." };
      }
    },
  }),

  addDomain: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.string(),
      tenantId: z.string(),
      domain: z.string().trim().toLowerCase(),
      verificationType: z.enum(["cname", "txt"]).default("cname"),
    }),
    handler: async ({ siteId, tenantId, domain, verificationType }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role || !canEditContent(role)) {
        return { ok: false, error: "Insufficient permissions to add domains." };
      }

      const domainRepo = new SupabaseDomainRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);
      const subRepo = new SupabaseSubscriptionRepository(context.locals.supabase);

      try {
        await checkTenantFeatureFlagUseCase({ tenantId, feature: "customDomains", repository: subRepo });
        await enforceTenantQuotaUseCase({ tenantId, resource: "custom_domains", repository: subRepo });

        const env = parseServerEnv(import.meta.env, process.env);
        const added = await addSiteDomainUseCase(
          context.locals.user,
          tenantId,
          { siteId, domain, verificationType },
          role,
          domainRepo,
          auditGateway,
          env.appHostname
        );

        let finalDomain = added;
        let autoVerified = false;
        try {
          const cnameTarget = `cname.${env.appHostname}`;
          const dnsGateway = new NodeDnsGateway();
          const verifyResult = await verifySiteDomainUseCase(
            context.locals.user,
            tenantId,
            siteId,
            added.id,
            role,
            cnameTarget,
            domainRepo,
            dnsGateway,
            auditGateway
          );
          if (verifyResult.verified) {
            finalDomain = verifyResult.domain;
            autoVerified = true;
          }
        } catch {
          // Si la verificación inmediata falla (lo habitual si aún no apuntaron el DNS),
          // queda en estado pending para que configuren el DNS o lo tome el cron.
        }

        return { ok: true, domain: finalDomain, autoVerified };
      } catch (error: any) {
        if (
          error instanceof DomainAuthorizationError ||
          error instanceof InvalidDomainError ||
          error instanceof DomainAlreadyRegisteredError ||
          error instanceof FeatureNotAllowedError ||
          error instanceof QuotaExceededError
        ) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: error?.message || "Failed to add domain." };
      }
    },
  }),

  verifyDomain: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.string(),
      tenantId: z.string(),
      domainId: z.string(),
    }),
    handler: async ({ siteId, tenantId, domainId }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role || !canEditContent(role)) {
        return { ok: false, error: "Insufficient permissions to verify domains." };
      }

      const env = parseServerEnv(import.meta.env, process.env);
      const cnameTarget = `cname.${env.appHostname}`;
      const domainRepo = new SupabaseDomainRepository(context.locals.supabase);
      const dnsGateway = new NodeDnsGateway();
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);

      try {
        const result = await verifySiteDomainUseCase(
          context.locals.user,
          tenantId,
          siteId,
          domainId,
          role,
          cnameTarget,
          domainRepo,
          dnsGateway,
          auditGateway
        );

        return { ok: true, verified: result.verified, message: result.message, domain: result.domain };
      } catch (error: any) {
        if (error instanceof DomainAuthorizationError || error instanceof DomainNotFoundError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: error?.message || "Failed to verify domain." };
      }
    },
  }),

  deleteDomain: defineAction({
    accept: "form",
    input: z.object({
      siteId: z.string(),
      tenantId: z.string(),
      domainId: z.string(),
    }),
    handler: async ({ siteId, tenantId, domainId }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role || !canEditContent(role)) {
        return { ok: false, error: "Insufficient permissions to delete domains." };
      }

      const domainRepo = new SupabaseDomainRepository(context.locals.supabase);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);

      try {
        await deleteSiteDomainUseCase(
          context.locals.user,
          tenantId,
          siteId,
          domainId,
          role,
          domainRepo,
          auditGateway
        );

        return { ok: true };
      } catch (error: any) {
        if (error instanceof DomainAuthorizationError || error instanceof DomainNotFoundError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: error?.message || "Failed to delete domain." };
      }
    },
  }),

  changePlan: defineAction({
    accept: "form",
    input: z.object({
      tenantId: z.string(),
      planId: z.enum(["starter", "pro", "agency"]),
    }),
    handler: async ({ tenantId, planId }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role) {
        return { ok: false, error: "Not a member of this tenant." };
      }

      const subRepo = new SupabaseSubscriptionRepository(context.locals.supabase);
      const isSuperadmin = await subRepo.isPlatformSuperadmin(context.locals.user.id);
      const auditGateway = new SupabaseAuditGateway(context.locals.supabase);

      try {
        const updated = await changeTenantPlanUseCase({
          tenantId,
          newPlanId: planId,
          actorUserId: context.locals.user.id,
          actorRole: role,
          isSuperadmin,
          repository: subRepo,
          auditGateway,
        });

        return { ok: true, subscription: updated };
      } catch (error: any) {
        if (error instanceof SubscriptionAuthorizationError || error instanceof InvalidPlanError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: error?.message || "Failed to change subscription plan." };
      }
    },
  }),

  createCheckoutSession: defineAction({
    accept: "form",
    input: z.object({
      tenantId: z.string(),
      planId: z.enum(["starter", "pro", "agency"]),
      returnUrl: z.string().default("/admin/billing"),
    }),
    handler: async ({ tenantId, planId, returnUrl }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role || role !== "owner") {
        return { ok: false, error: "Only tenant owners can initiate checkout." };
      }

      const billingGateway = new MockBillingGateway();
      const session = await billingGateway.createCheckoutSession(tenantId, planId, returnUrl);
      return { ok: true, checkoutUrl: session.checkoutUrl, sessionId: session.sessionId };
    },
  }),

  createCustomerPortalSession: defineAction({
    accept: "form",
    input: z.object({
      tenantId: z.string(),
      returnUrl: z.string().default("/admin/billing"),
    }),
    handler: async ({ tenantId, returnUrl }, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const role = await verifyTenantRole(context.locals.supabase, tenantId, context.locals.user.id);
      if (!role || role !== "owner") {
        return { ok: false, error: "Only tenant owners can manage billing portal." };
      }

      const billingGateway = new MockBillingGateway();
      const session = await billingGateway.createCustomerPortalSession(tenantId, returnUrl);
      return { ok: true, portalUrl: session.portalUrl };
    },
  }),

  onboardClient: defineAction({
    accept: "form",
    input: z.object({
      tenantName: z.string().trim().min(2).max(120),
      clientEmail: z.email().trim().max(254),
      clientPassword: z.string().min(8).max(128),
      siteName: z.string().trim().min(2).max(120),
      siteSlug: z.string().trim().min(2).max(63),
      templateKey: z.enum(TEMPLATE_KEYS),
      planId: z.enum(PLAN_IDS),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const subRepo = new SupabaseSubscriptionRepository(context.locals.supabase);
      const isSuperadmin = await subRepo.isPlatformSuperadmin(context.locals.user.id);
      if (!isSuperadmin) return { ok: false, error: "Forbidden: Superadmin access required." };

      try {
        const env = parseServerEnv(import.meta.env, process.env);
        const adminClient = createAdminClient(env);
        const gateway = new SupabaseClientOnboardingGateway(adminClient);

        const result = await onboardClientUseCase(
          {
            ...input,
            superadminUserId: context.locals.user.id,
          },
          gateway,
          true
        );

        return { ok: true, client: result };
      } catch (error: any) {
        if (error instanceof OnboardingValidationError || error instanceof SlugAlreadyTakenError) {
          return { ok: false, error: error.message };
        }
        return { ok: false, error: error?.message || "Failed to onboard client." };
      }
    },
  }),

  createPlatformPalette: defineAction({
    accept: "form",
    input: z.object({
      name: z.string().trim().min(2).max(64),
      description: z.string().trim().max(256).optional(),
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Formato hex inválido (#RRGGBB)"),
      secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Formato hex inválido (#RRGGBB)"),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Formato hex inválido (#RRGGBB)"),
      backgroundColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Formato hex inválido (#RRGGBB)"),
      textColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Formato hex inválido (#RRGGBB)"),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const subRepo = new SupabaseSubscriptionRepository(context.locals.supabase);
      const isSuperadmin = await subRepo.isPlatformSuperadmin(context.locals.user.id);
      if (!isSuperadmin) return { ok: false, error: "Forbidden: Superadmin access required." };

      const paletteRepo = new SupabasePaletteRepository(context.locals.supabase);
      const palette = await paletteRepo.createPalette(input);
      if (!palette) return { ok: false, error: "Failed to create palette." };

      return { ok: true, palette };
    },
  }),

  deletePlatformPalette: defineAction({
    accept: "form",
    input: z.object({
      paletteId: z.string().trim().min(1),
    }),
    handler: async (input, context) => {
      if (!context.locals.user) return { ok: false, error: "Authentication required." };
      const subRepo = new SupabaseSubscriptionRepository(context.locals.supabase);
      const isSuperadmin = await subRepo.isPlatformSuperadmin(context.locals.user.id);
      if (!isSuperadmin) return { ok: false, error: "Forbidden: Superadmin access required." };

      const paletteRepo = new SupabasePaletteRepository(context.locals.supabase);
      const deleted = await paletteRepo.deletePalette(input.paletteId);
      if (!deleted) return { ok: false, error: "Failed to delete palette or palette is protected." };

      return { ok: true };
    },
  }),
};

