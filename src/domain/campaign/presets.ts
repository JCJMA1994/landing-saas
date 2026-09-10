import type { CampaignPreset } from "./campaign";

export interface CampaignPresetConfig {
  key: CampaignPreset;
  displayName: string;
  description: string;
  defaultAccentColor: string;
  defaultBadgeText: string;
  seasonalEmoji: string;
  allowedOverrides: string[];
}

export const CAMPAIGN_PRESET_CONFIGS: Record<CampaignPreset, CampaignPresetConfig> = {
  "fiestas-patrias": {
    key: "fiestas-patrias",
    displayName: "Fiestas Patrias",
    description: "Celebración nacional con acentos patrios, escarapelas y promociones de temporada.",
    defaultAccentColor: "#dc2626",
    defaultBadgeText: "Especial Fiestas Patrias",
    seasonalEmoji: "🇵🇪",
    allowedOverrides: ["bannerText", "bannerLink", "badgeText", "accentColor", "showCountdown"],
  },
  navidad: {
    key: "navidad",
    displayName: "Navidad & Nochebuena",
    description: "Temática festiva navideña con countdown a medianoche y tonos festivos armoniosos.",
    defaultAccentColor: "#15803d",
    defaultBadgeText: "Promoción de Navidad",
    seasonalEmoji: "🎄",
    allowedOverrides: ["bannerText", "bannerLink", "badgeText", "accentColor", "showCountdown"],
  },
  "ano-nuevo": {
    key: "ano-nuevo",
    displayName: "Año Nuevo",
    description: "Acentos dorados de gala, bienvenida al nuevo ciclo anual y ofertas de inicio de año.",
    defaultAccentColor: "#d97706",
    defaultBadgeText: "Año Nuevo",
    seasonalEmoji: "✨",
    allowedOverrides: ["bannerText", "bannerLink", "badgeText", "accentColor", "showCountdown"],
  },
  custom: {
    key: "custom",
    displayName: "Campaña Personalizada",
    description: "Campaña comercial flexible con anuncio, countdown opcional y acentos personalizados.",
    defaultAccentColor: "#6366f1",
    defaultBadgeText: "Edición Limitada",
    seasonalEmoji: "⚡",
    allowedOverrides: ["bannerText", "bannerLink", "badgeText", "accentColor", "showCountdown"],
  },
};

export function getCampaignPresetConfig(preset: CampaignPreset): CampaignPresetConfig {
  return CAMPAIGN_PRESET_CONFIGS[preset] ?? CAMPAIGN_PRESET_CONFIGS.custom;
}
