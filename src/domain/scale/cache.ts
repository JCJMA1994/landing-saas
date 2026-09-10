export interface LandingCacheHeaderOptions {
  readonly checksum: string;
  readonly siteId: string;
  readonly tenantId: string;
}

export function buildLandingCacheHeaders(
  options: LandingCacheHeaderOptions
): Record<string, string> {
  const { checksum, siteId, tenantId } = options;
  const etag = `W/"${checksum.slice(0, 32)}"`;

  return {
    "Cache-Control": "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
    ETag: etag,
    "Surrogate-Key": `site-${siteId} tenant-${tenantId}`,
    "Surrogate-Control": "max-age=3600, stale-while-revalidate=86400",
    Vary: "Accept, Accept-Encoding, Host",
  };
}

export function buildStaticAssetCacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": "public, max-age=31536000, immutable",
    Vary: "Accept-Encoding",
  };
}

export function buildPrivateNoStoreCacheHeaders(): Record<string, string> {
  return {
    "Cache-Control": "private, no-cache, no-store, must-revalidate",
    Pragma: "no-cache",
    Expires: "0",
  };
}

export function isEtagFresh(
  clientIfNoneMatch: string | null | undefined,
  currentChecksum: string
): boolean {
  if (!clientIfNoneMatch) return false;
  const currentEtag = `W/"${currentChecksum.slice(0, 32)}"`;
  const cleanHeader = clientIfNoneMatch.trim();

  return cleanHeader === currentEtag || cleanHeader === `"${currentChecksum.slice(0, 32)}"`;
}
