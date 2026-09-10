import type { SupabaseClient } from "@supabase/supabase-js";
import {
  StorageGatewayError,
  type StorageGateway,
} from "../../application/site/storage-gateway";

const BUCKET_NAME = "site-assets";

export class SupabaseStorageGateway implements StorageGateway {
  constructor(private readonly client: SupabaseClient) {}

  async uploadFile(path: string, data: Uint8Array, mimeType: string): Promise<void> {
    try {
      const { error } = await this.client.storage
        .from(BUCKET_NAME)
        .upload(path, data, {
          contentType: mimeType,
          upsert: true,
        });

      if (error) throw new StorageGatewayError(error.message);
    } catch {
      throw new StorageGatewayError();
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const { error } = await this.client.storage.from(BUCKET_NAME).remove([path]);
      if (error) throw new StorageGatewayError(error.message);
    } catch {
      throw new StorageGatewayError();
    }
  }

  getUrl(path: string): string {
    const { data } = this.client.storage.from(BUCKET_NAME).getPublicUrl(path);
    return data.publicUrl;
  }
}
