import type { PublicationSnapshot } from "../../domain/publication/snapshot";
import type { SitePublication } from "../../domain/publication/publication";

export interface PublicationRepository {
  publishSnapshot(
    siteId: string,
    snapshot: PublicationSnapshot,
    checksum: string,
    publishedBy: string
  ): Promise<SitePublication>;

  getActivePublication(siteId: string): Promise<SitePublication | null>;
  getActivePublicationBySlug(slug: string): Promise<SitePublication | null>;
  getPublicationByVersion(siteId: string, version: number): Promise<SitePublication | null>;
  listHistory(siteId: string, limit?: number): Promise<SitePublication[]>;
}

export class PublicationRepositoryError extends Error {
  constructor(message = "Publication service is temporarily unavailable.") {
    super(message);
    this.name = "PublicationRepositoryError";
  }
}
