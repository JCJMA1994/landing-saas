import {
  TEMPLATE_KEYS,
  TEMPLATE_MANIFESTS,
  type TemplateKey,
  type TemplateManifest,
  type TemplateSection,
  type CampaignSlot,
} from "./manifest";
import type {
  ThemeButtonVariant,
  ThemeCardVariant,
  ThemeFont,
  ThemeRadius,
} from "../site/theme";

export interface TemplateTokenConstraints {
  preferredFont: ThemeFont;
  allowedFonts: readonly ThemeFont[];
  preferredRadius: ThemeRadius;
  allowedRadii: readonly ThemeRadius[];
  preferredButtonVariant: ThemeButtonVariant;
  allowedButtonVariants: readonly ThemeButtonVariant[];
  preferredCardVariant: ThemeCardVariant;
  allowedCardVariants: readonly ThemeCardVariant[];
}

export interface RegisteredTemplate extends TemplateManifest {
  tokenConstraints: TemplateTokenConstraints;
}

export const REGISTERED_TEMPLATES: Record<TemplateKey, RegisteredTemplate> = {
  "tech-diagnostic": {
    ...TEMPLATE_MANIFESTS["tech-diagnostic"],
    tokenConstraints: {
      preferredFont: "space-grotesk",
      allowedFonts: ["space-grotesk", "roboto", "inter"],
      preferredRadius: "sharp",
      allowedRadii: ["sharp", "subtle"],
      preferredButtonVariant: "solid",
      allowedButtonVariants: ["solid", "outline"],
      preferredCardVariant: "bordered",
      allowedCardVariants: ["bordered", "flat"],
    },
  },
  "repair-workshop": {
    ...TEMPLATE_MANIFESTS["repair-workshop"],
    tokenConstraints: {
      preferredFont: "roboto",
      allowedFonts: ["roboto", "space-grotesk", "inter"],
      preferredRadius: "subtle",
      allowedRadii: ["sharp", "subtle"],
      preferredButtonVariant: "outline",
      allowedButtonVariants: ["outline", "solid"],
      preferredCardVariant: "bordered",
      allowedCardVariants: ["bordered", "flat"],
    },
  },
  "system-monitor": {
    ...TEMPLATE_MANIFESTS["system-monitor"],
    tokenConstraints: {
      preferredFont: "space-grotesk",
      allowedFonts: ["space-grotesk", "inter"],
      preferredRadius: "subtle",
      allowedRadii: ["sharp", "subtle"],
      preferredButtonVariant: "solid",
      allowedButtonVariants: ["solid", "outline", "ghost"],
      preferredCardVariant: "glass",
      allowedCardVariants: ["glass", "bordered"],
    },
  },
  "tech-editorial": {
    ...TEMPLATE_MANIFESTS["tech-editorial"],
    tokenConstraints: {
      preferredFont: "inter",
      allowedFonts: ["inter", "roboto"],
      preferredRadius: "sharp",
      allowedRadii: ["sharp"],
      preferredButtonVariant: "ghost",
      allowedButtonVariants: ["ghost", "outline", "solid"],
      preferredCardVariant: "flat",
      allowedCardVariants: ["flat", "bordered"],
    },
  },
  "cyber-performance": {
    ...TEMPLATE_MANIFESTS["cyber-performance"],
    tokenConstraints: {
      preferredFont: "space-grotesk",
      allowedFonts: ["space-grotesk", "inter"],
      preferredRadius: "sharp",
      allowedRadii: ["sharp"],
      preferredButtonVariant: "gradient",
      allowedButtonVariants: ["gradient", "solid"],
      preferredCardVariant: "glass",
      allowedCardVariants: ["glass", "bordered"],
    },
  },
  "friendly-tech": {
    ...TEMPLATE_MANIFESTS["friendly-tech"],
    tokenConstraints: {
      preferredFont: "outfit",
      allowedFonts: ["outfit", "roboto", "inter"],
      preferredRadius: "rounded",
      allowedRadii: ["rounded", "pill", "subtle"],
      preferredButtonVariant: "solid",
      allowedButtonVariants: ["solid", "gradient"],
      preferredCardVariant: "elevated",
      allowedCardVariants: ["elevated", "bordered"],
    },
  },
};

export function getRegisteredTemplate(key: TemplateKey): RegisteredTemplate {
  const template = REGISTERED_TEMPLATES[key];
  if (!template) {
    throw new Error(`Template key '${key}' is not registered in the versioned template registry.`);
  }
  return template;
}

export function listRegisteredTemplates(): RegisteredTemplate[] {
  return TEMPLATE_KEYS.map((k) => REGISTERED_TEMPLATES[k]);
}

export function getTemplateVersion(key: TemplateKey): number {
  return getRegisteredTemplate(key).version;
}

export function supportsSection(key: TemplateKey, section: TemplateSection): boolean {
  return getRegisteredTemplate(key).supportedSections.includes(section);
}

export function supportsCampaignSlot(key: TemplateKey, slot: CampaignSlot): boolean {
  return getRegisteredTemplate(key).supportedCampaignSlots.includes(slot);
}
