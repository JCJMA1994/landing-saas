import { describe, expect, it } from "vitest";
import {
  calculateSnapshotChecksum,
  canonicalizeJson,
  createPublicationSnapshot,
  validatePublicationSnapshot,
} from "../../src/domain/publication/snapshot";
import { DEFAULT_SITE_THEME } from "../../src/domain/site/theme";

describe("Publication Snapshots & SHA-256 Checksums", () => {
  const sampleTheme = {
    siteId: "site-123",
    ...DEFAULT_SITE_THEME,
  };

  it("creates a well-formed publication snapshot from draft state", () => {
    const snapshot = createPublicationSnapshot({
      siteId: "site-123",
      siteName: "Tech Service Pro",
      siteSlug: "tech-service-pro",
      templateKey: "tech-diagnostic",
      theme: sampleTheme,
      hero: {
        siteId: "site-123",
        headline: "High precision repairs",
        subheadline: "Certified technicians at your service",
        ctaText: "Book Diagnosis",
        ctaLink: "#diagnosis",
      },
      cards: [
        {
          siteId: "site-123",
          title: "Diagnostic Check",
          description: "Full hardware test",
          iconKey: "cpu",
          sortOrder: 1,
        },
      ],
      promotions: [],
      contacts: null,
      publishedAt: "2026-09-10T12:00:00.000Z",
    });

    expect(snapshot.schemaVersion).toBe(1);
    expect(snapshot.siteName).toBe("Tech Service Pro");
    expect(snapshot.templateKey).toBe("tech-diagnostic");
    expect(snapshot.templateVersion).toBe(1);
    expect(snapshot.cards).toHaveLength(1);
    expect(snapshot.publishedAt).toBe("2026-09-10T12:00:00.000Z");
  });

  it("produces deterministic canonical JSON output regardless of key order", () => {
    const objA = { b: 2, a: 1, c: { z: 26, y: 25 } };
    const objB = { a: 1, c: { y: 25, z: 26 }, b: 2 };

    const canonicalA = canonicalizeJson(objA);
    const canonicalB = canonicalizeJson(objB);

    expect(canonicalA).toBe(canonicalB);
    expect(canonicalA).toBe('{"a":1,"b":2,"c":{"y":25,"z":26}}');
  });

  it("calculates deterministic 64-character hex SHA-256 checksums", async () => {
    const snapshot = createPublicationSnapshot({
      siteId: "site-123",
      siteName: "Workshop",
      siteSlug: "workshop",
      templateKey: "repair-workshop",
      theme: sampleTheme,
      hero: null,
      cards: [],
      promotions: [],
      contacts: null,
      publishedAt: "2026-09-10T10:00:00.000Z",
    });

    const checksum1 = await calculateSnapshotChecksum(snapshot);
    const checksum2 = await calculateSnapshotChecksum(snapshot);

    expect(checksum1).toHaveLength(64);
    expect(checksum1).toMatch(/^[0-9a-f]{64}$/);
    expect(checksum1).toBe(checksum2);
  });

  it("validates valid snapshot and rejects malformed objects", () => {
    const valid = createPublicationSnapshot({
      siteId: "site-123",
      siteName: "System",
      siteSlug: "system",
      templateKey: "system-monitor",
      theme: sampleTheme,
      hero: null,
      cards: [],
      promotions: [],
      contacts: null,
    });

    expect(() => validatePublicationSnapshot(valid)).not.toThrow();
    expect(() => validatePublicationSnapshot(null)).toThrow("Invalid publication snapshot");
    expect(() => validatePublicationSnapshot({ siteId: "123" })).toThrow("Invalid publication snapshot");
  });
});
