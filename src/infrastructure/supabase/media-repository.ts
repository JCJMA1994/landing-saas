import type { SupabaseClient } from "@supabase/supabase-js";
import type { AllowedMediaMime, MediaAsset } from "../../domain/site/media";
import {
  MediaRepositoryError,
  type MediaRepository,
} from "../../application/site/media-repository";

export class SupabaseMediaRepository implements MediaRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listBySite(siteId: string): Promise<MediaAsset[]> {
    try {
      const { data, error } = await this.client
        .from("media_assets")
        .select("*")
        .eq("site_id", siteId)
        .order("created_at", { ascending: false });

      if (error || !Array.isArray(data)) throw new MediaRepositoryError();

      return data.map((row: Record<string, unknown>) => ({
        id: row["id"] as string,
        tenantId: row["tenant_id"] as string,
        siteId: row["site_id"] as string,
        filePath: row["file_path"] as string,
        mimeType: row["mime_type"] as AllowedMediaMime,
        fileSizeBytes: row["file_size_bytes"] as number,
        altText: row["alt_text"] as string,
        createdAt: typeof row["created_at"] === "string" ? row["created_at"] : undefined,
      }));
    } catch {
      throw new MediaRepositoryError();
    }
  }

  async getById(id: string): Promise<MediaAsset | null> {
    try {
      const { data, error } = await this.client
        .from("media_assets")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw new MediaRepositoryError();
      if (!data) return null;

      const record = data as Record<string, unknown>;
      return {
        id: record["id"] as string,
        tenantId: record["tenant_id"] as string,
        siteId: record["site_id"] as string,
        filePath: record["file_path"] as string,
        mimeType: record["mime_type"] as AllowedMediaMime,
        fileSizeBytes: record["file_size_bytes"] as number,
        altText: record["alt_text"] as string,
        createdAt: typeof record["created_at"] === "string" ? record["created_at"] : undefined,
      };
    } catch {
      throw new MediaRepositoryError();
    }
  }

  async insert(asset: MediaAsset): Promise<MediaAsset> {
    try {
      const { data, error } = await this.client
        .from("media_assets")
        .insert({
          tenant_id: asset.tenantId,
          site_id: asset.siteId,
          file_path: asset.filePath,
          mime_type: asset.mimeType,
          file_size_bytes: asset.fileSizeBytes,
          alt_text: asset.altText,
        })
        .select()
        .single();

      if (error || !data) throw new MediaRepositoryError();

      const record = data as Record<string, unknown>;
      return {
        id: record["id"] as string,
        tenantId: record["tenant_id"] as string,
        siteId: record["site_id"] as string,
        filePath: record["file_path"] as string,
        mimeType: record["mime_type"] as AllowedMediaMime,
        fileSizeBytes: record["file_size_bytes"] as number,
        altText: record["alt_text"] as string,
        createdAt: typeof record["created_at"] === "string" ? record["created_at"] : undefined,
      };
    } catch {
      throw new MediaRepositoryError();
    }
  }

  async delete(id: string): Promise<void> {
    try {
      const { error } = await this.client.from("media_assets").delete().eq("id", id);
      if (error) throw new MediaRepositoryError();
    } catch {
      throw new MediaRepositoryError();
    }
  }
}
