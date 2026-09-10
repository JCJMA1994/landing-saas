import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CampaignRepositoryError,
  type CampaignRepository,
} from "../../application/campaign/campaign-repository";
import type { SiteCampaign } from "../../domain/campaign/campaign";

interface DbCampaignRow {
  id: string;
  site_id: string;
  name: string;
  preset: string;
  intensity: string;
  status: string;
  priority: number;
  timezone: string;
  starts_at: string;
  ends_at: string;
  banner_text: string | null;
  banner_link: string | null;
  badge_text: string | null;
  accent_color: string | null;
  show_countdown: boolean;
  created_at: string;
  updated_at: string;
}

function mapCampaign(row: DbCampaignRow): SiteCampaign {
  return {
    id: row.id,
    siteId: row.site_id,
    name: row.name,
    preset: row.preset as any,
    intensity: row.intensity as any,
    status: row.status as any,
    priority: row.priority,
    timezone: row.timezone,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    bannerText: row.banner_text,
    bannerLink: row.banner_link,
    badgeText: row.badge_text,
    accentColor: row.accent_color,
    showCountdown: row.show_countdown,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseCampaignRepository implements CampaignRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async listCampaigns(siteId: string): Promise<SiteCampaign[]> {
    try {
      const { data, error } = await this.supabase
        .from("site_campaigns")
        .select("*")
        .eq("site_id", siteId)
        .order("priority", { ascending: false })
        .order("starts_at", { ascending: false });

      if (error) throw new CampaignRepositoryError(error.message);
      return (data as DbCampaignRow[] || []).map(mapCampaign);
    } catch (error) {
      if (error instanceof CampaignRepositoryError) throw error;
      throw new CampaignRepositoryError((error as Error).message);
    }
  }

  async getCampaign(id: string): Promise<SiteCampaign | null> {
    try {
      const { data, error } = await this.supabase
        .from("site_campaigns")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw new CampaignRepositoryError(error.message);
      if (!data) return null;

      return mapCampaign(data as DbCampaignRow);
    } catch (error) {
      if (error instanceof CampaignRepositoryError) throw error;
      throw new CampaignRepositoryError((error as Error).message);
    }
  }

  async saveCampaign(campaign: Omit<SiteCampaign, "createdAt" | "updatedAt">): Promise<SiteCampaign> {
    try {
      const payload = {
        id: campaign.id,
        site_id: campaign.siteId,
        name: campaign.name,
        preset: campaign.preset,
        intensity: campaign.intensity,
        status: campaign.status,
        priority: campaign.priority,
        timezone: campaign.timezone,
        starts_at: campaign.startsAt,
        ends_at: campaign.endsAt,
        banner_text: campaign.bannerText,
        banner_link: campaign.bannerLink,
        badge_text: campaign.badgeText,
        accent_color: campaign.accentColor,
        show_countdown: campaign.showCountdown,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await this.supabase
        .from("site_campaigns")
        .upsert(payload)
        .select("*")
        .single();

      if (error || !data) {
        throw new CampaignRepositoryError(error?.message || "Failed to save campaign.");
      }

      return mapCampaign(data as DbCampaignRow);
    } catch (error) {
      if (error instanceof CampaignRepositoryError) throw error;
      throw new CampaignRepositoryError((error as Error).message);
    }
  }

  async deleteCampaign(id: string, siteId: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from("site_campaigns")
        .delete()
        .eq("id", id)
        .eq("site_id", siteId);

      if (error) throw new CampaignRepositoryError(error.message);
    } catch (error) {
      if (error instanceof CampaignRepositoryError) throw error;
      throw new CampaignRepositoryError((error as Error).message);
    }
  }

  async getActiveOrScheduledCampaigns(siteId: string): Promise<SiteCampaign[]> {
    try {
      const { data, error } = await this.supabase
        .from("site_campaigns")
        .select("*")
        .eq("site_id", siteId)
        .in("status", ["active", "scheduled"])
        .order("priority", { ascending: false });

      if (error) throw new CampaignRepositoryError(error.message);
      return (data as DbCampaignRow[] || []).map(mapCampaign);
    } catch (error) {
      if (error instanceof CampaignRepositoryError) throw error;
      throw new CampaignRepositoryError((error as Error).message);
    }
  }
}
