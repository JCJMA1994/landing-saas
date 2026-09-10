import { describe, expect, it } from "vitest";
import {
  buildLandingCacheHeaders,
  buildPrivateNoStoreCacheHeaders,
  buildStaticAssetCacheHeaders,
  isEtagFresh,
} from "../../src/domain/scale/cache";
import { MockCdnInvalidationGateway } from "../../src/infrastructure/cdn/mock-cdn-gateway";

describe("Scale & Edge Caching", () => {
  it("builds correct public edge cache headers with Surrogate-Key and ETag", () => {
    const headers = buildLandingCacheHeaders({
      checksum: "a1b2c3d4e5f67890123456789abcdef0",
      siteId: "site-101",
      tenantId: "tenant-202",
    });

    expect(headers["Cache-Control"]).toBe(
      "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400"
    );
    expect(headers["ETag"]).toBe('W/"a1b2c3d4e5f67890123456789abcdef0"');
    expect(headers["Surrogate-Key"]).toBe("site-site-101 tenant-tenant-202");
    expect(headers["Surrogate-Control"]).toBe("max-age=3600, stale-while-revalidate=86400");
  });

  it("builds long-term immutable cache headers for static assets", () => {
    const headers = buildStaticAssetCacheHeaders();
    expect(headers["Cache-Control"]).toBe("public, max-age=31536000, immutable");
  });

  it("builds private no-store headers for secure admin routes", () => {
    const headers = buildPrivateNoStoreCacheHeaders();
    expect(headers["Cache-Control"]).toBe("private, no-cache, no-store, must-revalidate");
    expect(headers["Pragma"]).toBe("no-cache");
  });

  it("evaluates ETag freshness correctly", () => {
    const checksum = "a1b2c3d4e5f67890123456789abcdef0";
    expect(isEtagFresh('W/"a1b2c3d4e5f67890123456789abcdef0"', checksum)).toBe(true);
    expect(isEtagFresh('"a1b2c3d4e5f67890123456789abcdef0"', checksum)).toBe(true);
    expect(isEtagFresh('W/"different"', checksum)).toBe(false);
    expect(isEtagFresh(null, checksum)).toBe(false);
  });

  it("purges site cache and records history with MockCdnInvalidationGateway", async () => {
    const cdn = new MockCdnInvalidationGateway();
    const result = await cdn.purgeSite({
      siteId: "site-101",
      tenantId: "tenant-202",
      paths: ["/sites/mi-taller", "/"],
    });

    expect(result.success).toBe(true);
    expect(result.purgedTags).toEqual(["site-site-101", "tenant-tenant-202"]);
    expect(result.purgedUrls).toEqual(["/sites/mi-taller", "/"]);
    expect(cdn.history).toHaveLength(1);
  });
});
