import type {
  CdnInvalidationGateway,
  PurgeResult,
  PurgeSiteInput,
} from "../../application/scale/cdn-gateway";

export class MockCdnInvalidationGateway implements CdnInvalidationGateway {
  public history: PurgeResult[] = [];

  async purgeSite(input: PurgeSiteInput): Promise<PurgeResult> {
    const purgedTags = [`site-${input.siteId}`, `tenant-${input.tenantId}`];
    const purgedUrls: string[] = [];

    if (input.paths && input.paths.length > 0) {
      for (const p of input.paths) {
        purgedUrls.push(p);
      }
    }

    const result: PurgeResult = {
      success: true,
      purgedTags,
      purgedUrls,
      timestamp: new Date().toISOString(),
    };

    this.history.push(result);
    return result;
  }
}
