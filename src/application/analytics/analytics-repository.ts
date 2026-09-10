import type { SiteAnalyticsEvent } from "../../domain/analytics/event";

export interface AnalyticsSummary {
  siteId: string;
  totalPageViews: number;
  totalCtaClicks: number;
  totalWhatsappClicks: number;
  totalCampaignViews: number;
  totalEvents: number;
  conversionRate: number; // percentage (e.g. 12.5%)
  recentEvents: SiteAnalyticsEvent[];
}

export interface AnalyticsRepository {
  recordEvent(event: SiteAnalyticsEvent): Promise<void>;
  getSummary(siteId: string, days?: number): Promise<AnalyticsSummary>;
}

export class AnalyticsRepositoryError extends Error {
  constructor(message = "Analytics repository temporarily unavailable.") {
    super(message);
    this.name = "AnalyticsRepositoryError";
  }
}
