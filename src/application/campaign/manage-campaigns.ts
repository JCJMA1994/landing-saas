import type { User } from "@supabase/supabase-js";
import type { AuditLogGateway } from "../audit/audit-gateway";
import type { CampaignRepository } from "./campaign-repository";
import {
  validateCampaignDates,
  isCampaignPreset,
  isCampaignIntensity,
  isCampaignStatus,
  InvalidCampaignError,
  type CampaignPreset,
  type CampaignIntensity,
  type CampaignStatus,
  type SiteCampaign,
} from "../../domain/campaign/campaign";
import { resolveActiveCampaign } from "../../domain/campaign/resolver";
import { canEditContent, type TenantRole } from "../../domain/tenant/roles";

export class CampaignAuthorizationError extends Error {
  constructor() {
    super("Insufficient permissions to manage site campaigns.");
    this.name = "CampaignAuthorizationError";
  }
}

export class CampaignNotFoundError extends Error {
  constructor(message = "Campaign record not found.") {
    super(message);
    this.name = "CampaignNotFoundError";
  }
}

export interface SaveCampaignInput {
  id?: string | undefined;
  siteId: string;
  name: string;
  preset: CampaignPreset;
  intensity: CampaignIntensity;
  status: CampaignStatus;
  priority: number;
  timezone?: string | undefined;
  startsAt: string;
  endsAt: string;
  bannerText?: string | null | undefined;
  bannerLink?: string | null | undefined;
  badgeText?: string | null | undefined;
  accentColor?: string | null | undefined;
  showCountdown?: boolean | undefined;
}

export async function saveCampaignUseCase(
  actor: User,
  tenantId: string,
  input: SaveCampaignInput,
  role: TenantRole,
  repository: CampaignRepository,
  auditGateway: AuditLogGateway
): Promise<SiteCampaign> {
  if (!canEditContent(role)) {
    throw new CampaignAuthorizationError();
  }

  if (!input.name || input.name.trim().length === 0) {
    throw new InvalidCampaignError("Campaign name is required.");
  }
  if (input.name.length > 100) {
    throw new InvalidCampaignError("Campaign name cannot exceed 100 characters.");
  }

  if (!isCampaignPreset(input.preset)) {
    throw new InvalidCampaignError("Invalid or unsupported campaign preset.");
  }

  if (!isCampaignIntensity(input.intensity)) {
    throw new InvalidCampaignError("Invalid campaign intensity level.");
  }

  if (!isCampaignStatus(input.status)) {
    throw new InvalidCampaignError("Invalid campaign status.");
  }

  validateCampaignDates(input.startsAt, input.endsAt);

  if (input.bannerText && input.bannerText.length > 200) {
    throw new InvalidCampaignError("Banner text cannot exceed 200 characters.");
  }

  if (input.badgeText && input.badgeText.length > 50) {
    throw new InvalidCampaignError("Badge text cannot exceed 50 characters.");
  }

  const campaignId = input.id || crypto.randomUUID();

  const campaignToSave: Omit<SiteCampaign, "createdAt" | "updatedAt"> = {
    id: campaignId,
    siteId: input.siteId,
    name: input.name.trim(),
    preset: input.preset,
    intensity: input.intensity,
    status: input.status,
    priority: input.priority ?? 0,
    timezone: input.timezone || "UTC",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    bannerText: input.bannerText ? input.bannerText.trim() : null,
    bannerLink: input.bannerLink ? input.bannerLink.trim() : null,
    badgeText: input.badgeText ? input.badgeText.trim() : null,
    accentColor: input.accentColor ? input.accentColor.trim() : null,
    showCountdown: Boolean(input.showCountdown),
  };

  const saved = await repository.saveCampaign(campaignToSave);

  await auditGateway.record({
    tenantId,
    actorUserId: actor.id,
    action: input.id ? "campaign.updated" : "campaign.created",
    resourceType: "campaign",
    resourceId: saved.id,
    metadata: {
      siteId: input.siteId,
      name: saved.name,
      preset: saved.preset,
      intensity: saved.intensity,
      status: saved.status,
      startsAt: saved.startsAt,
      endsAt: saved.endsAt,
    },
  });

  return saved;
}

export async function deleteCampaignUseCase(
  actor: User,
  tenantId: string,
  siteId: string,
  campaignId: string,
  role: TenantRole,
  repository: CampaignRepository,
  auditGateway: AuditLogGateway
): Promise<void> {
  if (!canEditContent(role)) {
    throw new CampaignAuthorizationError();
  }

  const existing = await repository.getCampaign(campaignId);
  if (!existing || existing.siteId !== siteId) {
    throw new CampaignNotFoundError();
  }

  await repository.deleteCampaign(campaignId, siteId);

  await auditGateway.record({
    tenantId,
    actorUserId: actor.id,
    action: "campaign.deleted",
    resourceType: "campaign",
    resourceId: campaignId,
    metadata: {
      siteId,
      deletedName: existing.name,
    },
  });
}

export async function resolveSiteCampaignUseCase(
  siteId: string,
  targetDate: Date = new Date(),
  repository: CampaignRepository
): Promise<SiteCampaign | null> {
  const eligible = await repository.getActiveOrScheduledCampaigns(siteId);
  return resolveActiveCampaign(eligible, targetDate);
}
