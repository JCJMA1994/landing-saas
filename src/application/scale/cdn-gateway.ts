export interface PurgeSiteInput {
  readonly siteId: string;
  readonly tenantId: string;
  readonly hostnames?: readonly string[] | undefined;
  readonly paths?: readonly string[] | undefined;
}

export interface PurgeResult {
  readonly success: boolean;
  readonly purgedTags: readonly string[];
  readonly purgedUrls: readonly string[];
  readonly timestamp: string;
}

export interface CdnInvalidationGateway {
  purgeSite(input: PurgeSiteInput): Promise<PurgeResult>;
}
