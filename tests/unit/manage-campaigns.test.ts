import { describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";
import {
  saveCampaignUseCase,
  deleteCampaignUseCase,
  CampaignAuthorizationError,
  CampaignNotFoundError,
} from "../../src/application/campaign/manage-campaigns";
import type { CampaignRepository } from "../../src/application/campaign/campaign-repository";
import type { SiteCampaign } from "../../src/domain/campaign/campaign";

import type { AuditLogGateway } from "../../src/application/audit/audit-gateway";

describe("Manage Campaigns Use Cases", () => {
  const mockUser: User = {
    id: "user-admin-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };

  const mockCampaign: SiteCampaign = {
    id: "camp-test-1",
    siteId: "site-10",
    name: "Cyber Week",
    preset: "custom",
    intensity: "festive",
    status: "active",
    priority: 5,
    timezone: "UTC",
    startsAt: "2026-11-20T00:00:00Z",
    endsAt: "2026-11-30T23:59:59Z",
    bannerText: "50% off en diagnósticos",
    showCountdown: true,
  };

  const mockRepo: CampaignRepository = {
    listCampaigns: vi.fn().mockResolvedValue([mockCampaign]),
    getCampaign: vi.fn().mockImplementation((id) =>
      id === mockCampaign.id ? Promise.resolve(mockCampaign) : Promise.resolve(null)
    ),
    saveCampaign: vi.fn().mockImplementation((c) => Promise.resolve({ ...c, id: c.id || "new-id" })),
    deleteCampaign: vi.fn().mockResolvedValue(undefined),
    getActiveOrScheduledCampaigns: vi.fn().mockResolvedValue([mockCampaign]),
  };

  const mockAuditGateway: AuditLogGateway = {
    record: vi.fn().mockResolvedValue(undefined),
    listRecent: vi.fn().mockResolvedValue([]),
  };

  it("denies saving campaign for viewer role", async () => {
    await expect(
      saveCampaignUseCase(
        mockUser,
        "tenant-1",
        {
          siteId: "site-10",
          name: "Test",
          preset: "navidad",
          intensity: "subtle",
          status: "draft",
          priority: 0,
          startsAt: "2026-12-01T00:00:00Z",
          endsAt: "2026-12-25T00:00:00Z",
        },
        "viewer",
        mockRepo,
        mockAuditGateway
      )
    ).rejects.toThrow(CampaignAuthorizationError);
  });

  it("saves campaign and records audit log for editor role", async () => {
    const saved = await saveCampaignUseCase(
      mockUser,
      "tenant-1",
      {
        siteId: "site-10",
        name: "Navidad 2026",
        preset: "navidad",
        intensity: "balanced",
        status: "scheduled",
        priority: 10,
        startsAt: "2026-12-01T00:00:00Z",
        endsAt: "2026-12-25T00:00:00Z",
        bannerText: "Promoción Navideña",
      },
      "editor",
      mockRepo,
      mockAuditGateway
    );

    expect(saved.name).toBe("Navidad 2026");
    expect(mockAuditGateway.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: "tenant-1",
        action: "campaign.created",
        resourceType: "campaign",
      })
    );
  });

  it("deletes campaign and logs audit record", async () => {
    await deleteCampaignUseCase(
      mockUser,
      "tenant-1",
      "site-10",
      "camp-test-1",
      "admin",
      mockRepo,
      mockAuditGateway
    );

    expect(mockRepo.deleteCampaign).toHaveBeenCalledWith("camp-test-1", "site-10");
    expect(mockAuditGateway.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "campaign.deleted",
        resourceId: "camp-test-1",
      })
    );
  });

  it("throws not found when deleting non-existent campaign", async () => {
    await expect(
      deleteCampaignUseCase(
        mockUser,
        "tenant-1",
        "site-10",
        "non-existent",
        "admin",
        mockRepo,
        mockAuditGateway
      )
    ).rejects.toThrow(CampaignNotFoundError);
  });
});
