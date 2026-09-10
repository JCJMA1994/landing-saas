import { describe, expect, it } from "vitest";
import {
  createPublicationSnapshot,
  calculateSnapshotChecksum,
  validatePublicationSnapshot,
} from "../../src/domain/publication/snapshot";
import { prepareRollbackSnapshot } from "../../src/domain/publication/publication";
import { DEFAULT_SITE_THEME } from "../../src/domain/site/theme";
import type { SitePublication } from "../../src/domain/publication/publication";
import type { SiteCard } from "../../src/domain/site/card";

describe("Publication Isolation & Integrity Guarantees", () => {
  it("deterministic sorting guarantees identical checksum regardless of property insertion order", async () => {
    const cards: SiteCard[] = [
      {
        id: "card-2",
        siteId: "site-iso-1",
        title: "Second Card",
        description: "Desc",
        iconKey: "wrench",
        sortOrder: 2,
      },
      {
        id: "card-1",
        siteId: "site-iso-1",
        title: "First Card",
        description: "Desc",
        iconKey: "cpu",
        sortOrder: 1,
      },
    ];

    const baseInput = {
      siteId: "site-iso-1",
      siteName: "Iso Site",
      siteSlug: "iso-site",
      templateKey: "system-monitor" as const,
      theme: { siteId: "site-iso-1", ...DEFAULT_SITE_THEME },
      hero: {
        siteId: "site-iso-1",
        headline: "Heading A",
        subheadline: "Subheading B",
        ctaText: "Go",
        ctaLink: "/go",
      },
      cards,
      promotions: [],
      contacts: null,
      publishedAt: "2026-09-15T12:00:00.000Z",
    };

    const snapshotA = createPublicationSnapshot(baseInput);

    // Swap initial card order in input array
    const snapshotB = createPublicationSnapshot({
      ...baseInput,
      cards: [baseInput.cards[1]!, baseInput.cards[0]!],
    });

    // Check that cards are sorted by sortOrder
    expect(snapshotA.cards[0]?.sortOrder).toBe(1);
    expect(snapshotB.cards[0]?.sortOrder).toBe(1);

    const hashA = await calculateSnapshotChecksum(snapshotA);
    const hashB = await calculateSnapshotChecksum(snapshotB);

    expect(hashA).toBe(hashB);
    expect(hashA).toMatch(/^[a-f0-9]{64}$/);
  });

  it("prepareRollbackSnapshot clones historical content while generating fresh timestamp", () => {
    const historicalPub: SitePublication = {
      id: "pub-v1",
      siteId: "site-iso-1",
      version: 1,
      snapshot: createPublicationSnapshot({
        siteId: "site-iso-1",
        siteName: "Original Title",
        siteSlug: "orig",
        templateKey: "cyber-performance",
        theme: { siteId: "site-iso-1", ...DEFAULT_SITE_THEME },
        hero: null,
        cards: [],
        promotions: [],
        contacts: null,
        publishedAt: "2026-01-01T00:00:00.000Z",
      }),
      checksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      publishedBy: "admin-1",
      publishedAt: "2026-01-01T00:00:00.000Z",
      isActive: false,
    };

    const rollbackSnapshot = prepareRollbackSnapshot(historicalPub);

    expect(rollbackSnapshot.siteName).toBe("Original Title");
    expect(rollbackSnapshot.templateKey).toBe("cyber-performance");
    expect(rollbackSnapshot.publishedAt).not.toBe(historicalPub.publishedAt);
    expect(new Date(rollbackSnapshot.publishedAt).getTime()).toBeGreaterThan(
      new Date("2026-01-01T00:00:00.000Z").getTime()
    );
  });

  it("validatePublicationSnapshot rejects corrupted or partial payloads", () => {
    expect(() => validatePublicationSnapshot(null)).toThrow("Snapshot must be a valid object.");
    expect(() => validatePublicationSnapshot({})).toThrow("Invalid schemaVersion.");
    expect(() => validatePublicationSnapshot({ schemaVersion: 1 })).toThrow("Missing or invalid siteId.");
    expect(() =>
      validatePublicationSnapshot({
        schemaVersion: 1,
        siteId: "site-1",
        siteName: "Name",
        siteSlug: "slug",
        templateKey: "invalid-template",
      })
    ).toThrow("Invalid or unsupported templateKey.");
  });
});
