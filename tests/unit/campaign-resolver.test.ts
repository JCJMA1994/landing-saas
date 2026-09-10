import { describe, expect, it } from "vitest";
import { resolveActiveCampaign } from "../../src/domain/campaign/resolver";
import type { SiteCampaign } from "../../src/domain/campaign/campaign";

describe("Campaign Deterministic Resolver", () => {
  const baseCampaign: SiteCampaign = {
    id: "camp-1",
    siteId: "site-10",
    name: "Fiestas Patrias",
    preset: "fiestas-patrias",
    intensity: "balanced",
    status: "active",
    priority: 10,
    timezone: "UTC",
    startsAt: "2026-07-25T00:00:00.000Z",
    endsAt: "2026-07-31T23:59:59.000Z",
    bannerText: "¡Felices Fiestas!",
    showCountdown: false,
  };

  it("returns winning campaign when target date falls inside time window", () => {
    const targetDate = new Date("2026-07-28T12:00:00.000Z");
    const resolved = resolveActiveCampaign([baseCampaign], targetDate);
    expect(resolved).not.toBeNull();
    expect(resolved?.id).toBe("camp-1");
  });

  it("returns null (graceful fallback) before start date or after end date", () => {
    const beforeDate = new Date("2026-07-24T23:59:59.000Z");
    expect(resolveActiveCampaign([baseCampaign], beforeDate)).toBeNull();

    const afterDate = new Date("2026-08-01T00:00:00.000Z");
    expect(resolveActiveCampaign([baseCampaign], afterDate)).toBeNull();
  });

  it("ignores draft and archived campaigns regardless of date match", () => {
    const draftCamp: SiteCampaign = { ...baseCampaign, id: "draft-1", status: "draft" };
    const archivedCamp: SiteCampaign = { ...baseCampaign, id: "arch-1", status: "archived" };
    const targetDate = new Date("2026-07-28T12:00:00.000Z");

    expect(resolveActiveCampaign([draftCamp, archivedCamp], targetDate)).toBeNull();
  });

  it("respects priority order when multiple campaigns are concurrently active", () => {
    const normalPriority: SiteCampaign = {
      ...baseCampaign,
      id: "normal",
      priority: 5,
      name: "Normal Promo",
    };
    const highPriority: SiteCampaign = {
      ...baseCampaign,
      id: "high",
      priority: 20,
      name: "Cyber Day Flash",
    };

    const targetDate = new Date("2026-07-28T12:00:00.000Z");
    const winner = resolveActiveCampaign([normalPriority, highPriority], targetDate);
    expect(winner?.id).toBe("high");
    expect(winner?.name).toBe("Cyber Day Flash");
  });

  it("breaks priority ties by most recent startsAt timestamp", () => {
    const earlierCamp: SiteCampaign = {
      ...baseCampaign,
      id: "earlier",
      priority: 10,
      startsAt: "2026-07-20T00:00:00.000Z",
    };
    const laterCamp: SiteCampaign = {
      ...baseCampaign,
      id: "later",
      priority: 10,
      startsAt: "2026-07-27T00:00:00.000Z",
    };

    const targetDate = new Date("2026-07-28T12:00:00.000Z");
    const winner = resolveActiveCampaign([earlierCamp, laterCamp], targetDate);
    expect(winner?.id).toBe("later");
  });
});
