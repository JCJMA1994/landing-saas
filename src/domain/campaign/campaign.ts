export const CAMPAIGN_PRESETS = [
  "fiestas-patrias",
  "navidad",
  "ano-nuevo",
  "custom",
] as const;
export type CampaignPreset = (typeof CAMPAIGN_PRESETS)[number];

export const CAMPAIGN_INTENSITIES = [
  "subtle",
  "balanced",
  "festive",
] as const;
export type CampaignIntensity = (typeof CAMPAIGN_INTENSITIES)[number];

export const CAMPAIGN_STATUSES = [
  "draft",
  "scheduled",
  "active",
  "archived",
] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

export interface SiteCampaign {
  id: string;
  siteId: string;
  name: string;
  preset: CampaignPreset;
  intensity: CampaignIntensity;
  status: CampaignStatus;
  priority: number;
  timezone: string;
  startsAt: string; // ISO 8601 UTC
  endsAt: string; // ISO 8601 UTC
  bannerText?: string | null | undefined;
  bannerLink?: string | null | undefined;
  badgeText?: string | null | undefined;
  accentColor?: string | null | undefined;
  showCountdown: boolean;
  createdAt?: string | undefined;
  updatedAt?: string | undefined;
}

export class InvalidCampaignError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidCampaignError";
  }
}

export function isCampaignPreset(value: unknown): value is CampaignPreset {
  return typeof value === "string" && CAMPAIGN_PRESETS.includes(value as CampaignPreset);
}

export function isCampaignIntensity(value: unknown): value is CampaignIntensity {
  return typeof value === "string" && CAMPAIGN_INTENSITIES.includes(value as CampaignIntensity);
}

export function isCampaignStatus(value: unknown): value is CampaignStatus {
  return typeof value === "string" && CAMPAIGN_STATUSES.includes(value as CampaignStatus);
}

export function validateCampaignDates(startsAt: string, endsAt: string): void {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();

  if (isNaN(start)) {
    throw new InvalidCampaignError("Invalid startsAt timestamp format.");
  }
  if (isNaN(end)) {
    throw new InvalidCampaignError("Invalid endsAt timestamp format.");
  }
  if (end <= start) {
    throw new InvalidCampaignError("Campaign endsAt must be strictly greater than startsAt.");
  }
}
