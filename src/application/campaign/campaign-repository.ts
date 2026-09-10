import type { SiteCampaign } from "../../domain/campaign/campaign";

export class CampaignRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CampaignRepositoryError";
  }
}

export interface CampaignRepository {
  listCampaigns(siteId: string): Promise<SiteCampaign[]>;
  getCampaign(id: string): Promise<SiteCampaign | null>;
  saveCampaign(campaign: Omit<SiteCampaign, "createdAt" | "updatedAt">): Promise<SiteCampaign>;
  deleteCampaign(id: string, siteId: string): Promise<void>;
  getActiveOrScheduledCampaigns(siteId: string): Promise<SiteCampaign[]>;
}
