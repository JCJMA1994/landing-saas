import type { SupabaseClient } from "@supabase/supabase-js";
import {
  PublicationRepositoryError,
  type PublicationRepository,
} from "../../application/publication/publication-repository";
import {
  validatePublicationSnapshot,
  type PublicationSnapshot,
} from "../../domain/publication/snapshot";
import type { SitePublication } from "../../domain/publication/publication";

interface DbPublicationRow {
  id: string;
  site_id: string;
  version: number;
  snapshot: unknown;
  checksum: string;
  published_by: string;
  published_at: string;
  is_active: boolean;
}

function mapPublication(row: DbPublicationRow): SitePublication {
  return {
    id: row.id,
    siteId: row.site_id,
    version: row.version,
    snapshot: validatePublicationSnapshot(row.snapshot),
    checksum: row.checksum,
    publishedBy: row.published_by,
    publishedAt: row.published_at,
    isActive: row.is_active,
  };
}

export class SupabasePublicationRepository implements PublicationRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async publishSnapshot(
    siteId: string,
    snapshot: PublicationSnapshot,
    checksum: string,
    publishedBy: string
  ): Promise<SitePublication> {
    try {
      // 1. Get current max version
      const { data: maxRow, error: maxError } = await this.supabase
        .from("site_publications")
        .select("version")
        .eq("site_id", siteId)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (maxError) throw new PublicationRepositoryError(maxError.message);

      const nextVersion = (maxRow?.version ?? 0) + 1;

      // 2. Deactivate currently active publication if any
      const { error: deactivationError } = await this.supabase
        .from("site_publications")
        .update({ is_active: false })
        .eq("site_id", siteId)
        .eq("is_active", true);

      if (deactivationError) throw new PublicationRepositoryError(deactivationError.message);

      // 3. Insert new active publication
      const { data: newRow, error: insertError } = await this.supabase
        .from("site_publications")
        .insert({
          site_id: siteId,
          version: nextVersion,
          snapshot,
          checksum,
          published_by: publishedBy,
          is_active: true,
        })
        .select("id, site_id, version, snapshot, checksum, published_by, published_at, is_active")
        .single();

      if (insertError || !newRow) {
        throw new PublicationRepositoryError(insertError?.message || "Failed to insert publication.");
      }

      return mapPublication(newRow as DbPublicationRow);
    } catch (error) {
      if (error instanceof PublicationRepositoryError) throw error;
      throw new PublicationRepositoryError((error as Error).message);
    }
  }

  async getActivePublication(siteId: string): Promise<SitePublication | null> {
    try {
      const { data, error } = await this.supabase
        .from("site_publications")
        .select("id, site_id, version, snapshot, checksum, published_by, published_at, is_active")
        .eq("site_id", siteId)
        .eq("is_active", true)
        .maybeSingle();

      if (error) throw new PublicationRepositoryError(error.message);
      if (!data) return null;

      return mapPublication(data as DbPublicationRow);
    } catch (error) {
      if (error instanceof PublicationRepositoryError) throw error;
      throw new PublicationRepositoryError((error as Error).message);
    }
  }

  async getActivePublicationBySlug(slug: string): Promise<SitePublication | null> {
    try {
      // Query site by slug
      const { data: site, error: siteError } = await this.supabase
        .from("sites")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();

      if (siteError || !site) return null;

      return this.getActivePublication(site.id);
    } catch (error) {
      if (error instanceof PublicationRepositoryError) throw error;
      throw new PublicationRepositoryError((error as Error).message);
    }
  }

  async getPublicationByVersion(siteId: string, version: number): Promise<SitePublication | null> {
    try {
      const { data, error } = await this.supabase
        .from("site_publications")
        .select("id, site_id, version, snapshot, checksum, published_by, published_at, is_active")
        .eq("site_id", siteId)
        .eq("version", version)
        .maybeSingle();

      if (error) throw new PublicationRepositoryError(error.message);
      if (!data) return null;

      return mapPublication(data as DbPublicationRow);
    } catch (error) {
      if (error instanceof PublicationRepositoryError) throw error;
      throw new PublicationRepositoryError((error as Error).message);
    }
  }

  async listHistory(siteId: string, limit = 50): Promise<SitePublication[]> {
    try {
      const { data, error } = await this.supabase
        .from("site_publications")
        .select("id, site_id, version, snapshot, checksum, published_by, published_at, is_active")
        .eq("site_id", siteId)
        .order("version", { ascending: false })
        .limit(limit);

      if (error) throw new PublicationRepositoryError(error.message);
      if (!data) return [];

      return data.map((row) => mapPublication(row as DbPublicationRow));
    } catch (error) {
      if (error instanceof PublicationRepositoryError) throw error;
      throw new PublicationRepositoryError((error as Error).message);
    }
  }
}
