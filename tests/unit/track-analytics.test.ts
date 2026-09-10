import { describe, expect, it, vi } from "vitest";
import {
  trackAnalyticsEventUseCase,
  getSiteAnalyticsSummaryUseCase,
  InvalidAnalyticsEventError,
  AnalyticsAuthorizationError,
} from "../../src/application/analytics/track-event";
import type { AnalyticsRepository } from "../../src/application/analytics/analytics-repository";

describe("Analytics Application Use Cases", () => {
  const mockRepo: AnalyticsRepository = {
    recordEvent: vi.fn().mockResolvedValue(undefined),
    getSummary: vi.fn().mockResolvedValue({
      siteId: "site-1",
      totalPageViews: 100,
      totalCtaClicks: 15,
      totalWhatsappClicks: 10,
      totalCampaignViews: 40,
      totalEvents: 165,
      conversionRate: 25.0,
      recentEvents: [],
    }),
  };

  it("rejects invalid or unsupported event names", async () => {
    await expect(
      trackAnalyticsEventUseCase(
        {
          tenantId: "tenant-1",
          siteId: "site-1",
          eventName: "random_hack_event",
          path: "/",
        },
        mockRepo
      )
    ).rejects.toThrow(InvalidAnalyticsEventError);
  });

  it("rejects payload missing siteId, tenantId or path", async () => {
    await expect(
      trackAnalyticsEventUseCase(
        {
          tenantId: "",
          siteId: "site-1",
          eventName: "page_view",
          path: "/",
        },
        mockRepo
      )
    ).rejects.toThrow(InvalidAnalyticsEventError);
  });

  it("records valid event with pseudonymous user-agent hash", async () => {
    await trackAnalyticsEventUseCase(
      {
        tenantId: "tenant-1",
        siteId: "site-1",
        eventName: "page_view",
        path: "/sites/taller-el-rayo",
        referrer: "https://google.com",
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      },
      mockRepo
    );

    expect(mockRepo.recordEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        siteId: "site-1",
        eventName: "page_view",
        path: "/sites/taller-el-rayo",
        userAgentHash: expect.stringMatching(/^[0-9a-f]{32}$/),
      })
    );
  });

  it("returns aggregated analytics summary for tenant member", async () => {
    const summary = await getSiteAnalyticsSummaryUseCase("site-1", "editor", mockRepo, 30);

    expect(summary.totalPageViews).toBe(100);
    expect(summary.totalCtaClicks).toBe(15);
    expect(summary.totalWhatsappClicks).toBe(10);
    expect(summary.conversionRate).toBe(25.0);
  });

  it("denies access when no tenant role is provided", async () => {
    await expect(
      getSiteAnalyticsSummaryUseCase("site-1", null as any, mockRepo)
    ).rejects.toThrow(AnalyticsAuthorizationError);
  });
});
