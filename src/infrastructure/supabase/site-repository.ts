import {
  SiteRepositoryError,
  type AccessibleSite,
  type SiteRepository,
} from "../../application/sites/site-repository";

interface QueryError {
  message: string;
}

export type AccessibleSitesQuery = () => Promise<{ data: unknown; error: QueryError | null }>;

function mapSite(row: unknown): AccessibleSite {
  if (!row || typeof row !== "object") throw new SiteRepositoryError();
  const record = row as Record<string, unknown>;
  if (
    typeof record["id"] !== "string" ||
    typeof record["name"] !== "string" ||
    typeof record["slug"] !== "string"
  ) throw new SiteRepositoryError();

  const name = record["name"].trim();
  if (!name || !record["slug"]) throw new SiteRepositoryError();
  return { id: record["id"], name, slug: record["slug"] };
}

export class SupabaseSiteRepository implements SiteRepository {
  constructor(private readonly query: AccessibleSitesQuery) {}

  async listAccessible(): Promise<AccessibleSite[]> {
    try {
      const { data, error } = await this.query();
      if (error || !Array.isArray(data)) throw new SiteRepositoryError();
      return data.map(mapSite);
    } catch {
      throw new SiteRepositoryError();
    }
  }
}
