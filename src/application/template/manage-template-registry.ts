import type { User, SupabaseClient } from "@supabase/supabase-js";
import type { AuditLogGateway } from "../audit/audit-gateway";
import type { CampaignRepository } from "../campaign/campaign-repository";
import type { ThemeRepository } from "../site/theme-repository";
import type { CardRepository } from "../site/card-repository";
import type { PromotionRepository } from "../site/promotion-repository";
import type { ContactRepository } from "../site/contact-repository";
import { isTemplateKey, type TemplateKey } from "../../domain/template/manifest";
import { getRegisteredTemplate } from "../../domain/template/registry";
import {
  checkTemplateCompatibility,
  type TemplateCompatibilityReport,
} from "../../domain/template/compatibility";
import { canEditContent, type TenantRole } from "../../domain/tenant/roles";
import type { ThemeButtonVariant, ThemeCardVariant, ThemeFont, ThemeRadius } from "../../domain/site/theme";

export class TemplateSwitchAuthorizationError extends Error {
  constructor() {
    super("Insufficient permissions to switch site template.");
    this.name = "TemplateSwitchAuthorizationError";
  }
}

export class InvalidTemplateError extends Error {
  constructor(message = "Invalid or unsupported template key.") {
    super(message);
    this.name = "InvalidTemplateError";
  }
}

export interface EvaluateTemplateSwitchInput {
  siteId: string;
  targetTemplateKey: TemplateKey;
  campaignRepo: CampaignRepository;
  themeRepo: ThemeRepository;
  cardRepo: CardRepository;
  promoRepo: PromotionRepository;
  contactRepo: ContactRepository;
}

export async function evaluateTemplateSwitchUseCase(
  input: EvaluateTemplateSwitchInput
): Promise<TemplateCompatibilityReport> {
  if (!isTemplateKey(input.targetTemplateKey)) {
    throw new InvalidTemplateError();
  }

  const [campaigns, theme, cards, promotions, contacts] = await Promise.all([
    input.campaignRepo.getActiveOrScheduledCampaigns(input.siteId),
    input.themeRepo.getTheme(input.siteId),
    input.cardRepo.listCards(input.siteId),
    input.promoRepo.listPromotions(input.siteId),
    input.contactRepo.getContacts(input.siteId),
  ]);

  return checkTemplateCompatibility({
    targetTemplateKey: input.targetTemplateKey,
    activeCampaigns: campaigns,
    currentTheme: theme ?? undefined,
    hasHero: true,
    hasCards: cards.length > 0,
    hasPromotions: promotions.length > 0,
    hasContacts: Boolean(contacts),
  });
}

export interface SwitchTemplateOptions {
  applySuggestedVariants?: boolean | undefined;
}

export async function switchSiteTemplateUseCase(
  actor: User,
  tenantId: string,
  siteId: string,
  targetTemplateKey: TemplateKey,
  role: TenantRole,
  supabase: SupabaseClient,
  themeRepo: ThemeRepository,
  auditGateway: AuditLogGateway,
  options: SwitchTemplateOptions = {}
): Promise<{ ok: boolean; report: TemplateCompatibilityReport }> {
  if (!canEditContent(role)) {
    throw new TemplateSwitchAuthorizationError();
  }

  if (!isTemplateKey(targetTemplateKey)) {
    throw new InvalidTemplateError();
  }

  const registered = getRegisteredTemplate(targetTemplateKey);

  // Fetch current site
  const { data: currentSite, error: fetchError } = await supabase
    .from("sites")
    .select("template_key")
    .eq("id", siteId)
    .eq("tenant_id", tenantId)
    .maybeSingle();

  if (fetchError || !currentSite) {
    throw new Error("Site not found.");
  }

  const previousTemplateKey = currentSite.template_key || "tech-diagnostic";

  // Update site template_key
  const { error: updateError } = await supabase
    .from("sites")
    .update({ template_key: targetTemplateKey })
    .eq("id", siteId)
    .eq("tenant_id", tenantId);

  if (updateError) {
    throw new Error(`Failed to update site template: ${updateError.message}`);
  }

  // Optionally apply suggested variants (font, radius, button, card)
  if (options.applySuggestedVariants) {
    const existingTheme = await themeRepo.getTheme(siteId);
    if (existingTheme) {
      await themeRepo.saveTheme({
        ...existingTheme,
        fontKey: registered.tokenConstraints.preferredFont as ThemeFont,
        radiusKey: registered.tokenConstraints.preferredRadius as ThemeRadius,
        buttonVariant: registered.tokenConstraints.preferredButtonVariant as ThemeButtonVariant,
        cardVariant: registered.tokenConstraints.preferredCardVariant as ThemeCardVariant,
      });
    }
  }

  await auditGateway.record({
    tenantId,
    actorUserId: actor.id,
    action: "site_template.switched",
    resourceType: "site",
    resourceId: siteId,
    metadata: {
      previousTemplateKey,
      newTemplateKey: targetTemplateKey,
      templateVersion: registered.version,
      appliedSuggestedVariants: Boolean(options.applySuggestedVariants),
    },
  });

  const report = checkTemplateCompatibility({
    targetTemplateKey,
  });

  return { ok: true, report };
}
