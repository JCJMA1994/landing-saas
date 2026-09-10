import type { PublicationSnapshot } from "./snapshot";

export interface SitePublication {
  id: string;
  siteId: string;
  version: number;
  snapshot: PublicationSnapshot;
  checksum: string;
  publishedBy: string;
  publishedAt: string;
  isActive: boolean;
}

/**
 * Prepares a new snapshot for a rollback operation.
 * Conforms to ADR 0002 & skills/publishing.skill.md:
 * Rollback creates an immutable new publication version rather than re-activating stale historical records.
 */
export function prepareRollbackSnapshot(
  targetPublication: SitePublication,
  newPublishedAt = new Date().toISOString()
): PublicationSnapshot {
  return {
    ...targetPublication.snapshot,
    publishedAt: newPublishedAt,
  };
}
