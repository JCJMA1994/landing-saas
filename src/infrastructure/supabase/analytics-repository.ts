import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AnalyticsRepositoryError,
  type AnalyticsRepository,
  type AnalyticsSummary,
} from "../../application/analytics/analytics-repository";
import type { SiteAnalyticsEvent } from "../../domain/analytics/event";

interface DbEventRow {
  id: string;
  tenant_id: string;
  site_id: string;
  event_name: string;
  path: string;
  referrer: string | null;
  user_agent_hash: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export class SupabaseAnalyticsRepository implements AnalyticsRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async recordEvent(event: SiteAnalyticsEvent): Promise<void> {
    try {
      const { error } = await this.supabase.from("site_analytics_events").insert({
        tenant_id: event.tenantId,
        site_id: event.siteId,
        event_name: event.eventName,
        path: event.path,
        referrer: event.referrer ?? null,
        user_agent_hash: event.userAgentHash ?? null,
        metadata: event.metadata ?? {},
      });

      if (error) throw error;
    } catch (err: any) {
      throw new AnalyticsRepositoryError(err.message);
    }
  }

  async getSummary(siteId: string, days = 30): Promise<AnalyticsSummary> {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

      const { data, error } = await this.supabase
        .from("site_analytics_events")
        .select("*")
        .eq("site_id", siteId)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;

      const rows = (data as DbEventRow[]) || [];
      let totalPageViews = 0;
      let totalCtaClicks = 0;
      let totalWhatsappClicks = 0;
      let totalCampaignViews = 0;

      for (const row of rows) {
        if (row.event_name === "page_view") totalPageViews++;
        else if (row.event_name === "cta_click") totalCtaClicks++;
        else if (row.event_name === "whatsapp_click") totalWhatsappClicks++;
        else if (row.event_name === "campaign_view") totalCampaignViews++;
      }

      const totalConversions = totalCtaClicks + totalWhatsappClicks;
      const conversionRate = totalPageViews > 0
        ? Math.round((totalConversions / totalPageViews) * 1000) / 10
        : 0;

      const recentEvents: SiteAnalyticsEvent[] = rows.slice(0, 50).map((r) => ({
        id: r.id,
        tenantId: r.tenant_id,
        siteId: r.site_id,
        eventName: r.event_name as any,
        path: r.path,
        referrer: r.referrer,
        userAgentHash: r.user_agent_hash,
        metadata: r.metadata,
        createdAt: r.created_at,
      }));

      return {
        siteId,
        totalPageViews,
        totalCtaClicks,
        totalWhatsappClicks,
        totalCampaignViews,
        totalEvents: rows.length,
        conversionRate,
        recentEvents,
      };
    } catch (err: any) {
      throw new AnalyticsRepositoryError(err.message);
    }
  }
}
