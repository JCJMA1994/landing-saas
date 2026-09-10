import type { TemplateKey } from "./manifest";
import { getRegisteredTemplate, supportsCampaignSlot, supportsSection } from "./registry";
import type { SiteCampaign } from "../campaign/campaign";
import type { SiteTheme } from "../site/theme";

export interface CompatibilityWarning {
  type: "campaign_slot" | "section" | "token";
  severity: "info" | "warning";
  code: string;
  message: string;
}

export interface CompatibilityCheckInput {
  targetTemplateKey: TemplateKey;
  activeCampaigns?: SiteCampaign[] | undefined;
  currentTheme?: SiteTheme | undefined;
  hasHero?: boolean | undefined;
  hasCards?: boolean | undefined;
  hasPromotions?: boolean | undefined;
  hasContacts?: boolean | undefined;
}

export interface TemplateCompatibilityReport {
  targetTemplateKey: TemplateKey;
  targetTemplateName: string;
  targetTemplateVersion: number;
  isCompatible: boolean;
  warnings: CompatibilityWarning[];
  suggestedThemeVariants: {
    fontKey: string;
    radiusKey: string;
    buttonVariant: string;
    cardVariant: string;
  };
}

export function checkTemplateCompatibility(
  input: CompatibilityCheckInput
): TemplateCompatibilityReport {
  const targetTemplate = getRegisteredTemplate(input.targetTemplateKey);
  const warnings: CompatibilityWarning[] = [];

  // 1. Check Section Compatibility
  if (input.hasHero && !supportsSection(input.targetTemplateKey, "hero")) {
    warnings.push({
      type: "section",
      severity: "warning",
      code: "SECTION_HERO_UNSUPPORTED",
      message: `El template '${targetTemplate.name}' no incluye sección Hero.`,
    });
  }
  if (input.hasCards && !supportsSection(input.targetTemplateKey, "cards")) {
    warnings.push({
      type: "section",
      severity: "warning",
      code: "SECTION_CARDS_UNSUPPORTED",
      message: `El template '${targetTemplate.name}' no renderiza tarjetas de características.`,
    });
  }
  if (input.hasPromotions && !supportsSection(input.targetTemplateKey, "promotions")) {
    warnings.push({
      type: "section",
      severity: "warning",
      code: "SECTION_PROMOTIONS_UNSUPPORTED",
      message: `El template '${targetTemplate.name}' no cuenta con carril de promociones.`,
    });
  }
  if (input.hasContacts && !supportsSection(input.targetTemplateKey, "contacts")) {
    warnings.push({
      type: "section",
      severity: "warning",
      code: "SECTION_CONTACTS_UNSUPPORTED",
      message: `El template '${targetTemplate.name}' no soporta canales de contacto directos.`,
    });
  }

  // 2. Check Campaign Slot Compatibility
  if (input.activeCampaigns && input.activeCampaigns.length > 0) {
    for (const camp of input.activeCampaigns) {
      if (camp.intensity === "festive" && !supportsCampaignSlot(input.targetTemplateKey, "decorations")) {
        warnings.push({
          type: "campaign_slot",
          severity: "info",
          code: "CAMPAIGN_DECORATIONS_DEGRADED",
          message: `La campaña activa '${camp.name}' usa intensidad festiva, pero '${targetTemplate.name}' tiene dirección artística limpia y no renderiza decoraciones adicionales (degradará a modo sobrio sin decoraciones).`,
        });
      }

      if (camp.bannerText && !supportsCampaignSlot(input.targetTemplateKey, "announcement")) {
        warnings.push({
          type: "campaign_slot",
          severity: "warning",
          code: "CAMPAIGN_ANNOUNCEMENT_UNSUPPORTED",
          message: `El template '${targetTemplate.name}' no soporta barra superior de anuncio para la campaña '${camp.name}'.`,
        });
      }
    }
  }

  // 3. Check Token Constraints against Current Theme
  if (input.currentTheme) {
    const { tokenConstraints } = targetTemplate;

    if (!tokenConstraints.allowedFonts.includes(input.currentTheme.fontKey)) {
      warnings.push({
        type: "token",
        severity: "info",
        code: "FONT_NOT_RECOMMENDED",
        message: `La tipografía actual '${input.currentTheme.fontKey}' no forma parte de la paleta recomendada para '${targetTemplate.name}' (recomendada: '${tokenConstraints.preferredFont}').`,
      });
    }

    if (!tokenConstraints.allowedRadii.includes(input.currentTheme.radiusKey)) {
      warnings.push({
        type: "token",
        severity: "info",
        code: "RADIUS_NOT_RECOMMENDED",
        message: `El radio de curvatura '${input.currentTheme.radiusKey}' difiere de la dirección visual de '${targetTemplate.name}' (recomendado: '${tokenConstraints.preferredRadius}').`,
      });
    }
  }

  return {
    targetTemplateKey: input.targetTemplateKey,
    targetTemplateName: targetTemplate.name,
    targetTemplateVersion: targetTemplate.version,
    isCompatible: true, // All 6 authentic templates support core sections with graceful degradation
    warnings,
    suggestedThemeVariants: {
      fontKey: targetTemplate.tokenConstraints.preferredFont,
      radiusKey: targetTemplate.tokenConstraints.preferredRadius,
      buttonVariant: targetTemplate.tokenConstraints.preferredButtonVariant,
      cardVariant: targetTemplate.tokenConstraints.preferredCardVariant,
    },
  };
}
