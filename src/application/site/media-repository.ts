import type { MediaAsset } from "../../domain/site/media";

export interface MediaRepository {
  listBySite(siteId: string): Promise<MediaAsset[]>;
  getById(id: string): Promise<MediaAsset | null>;
  insert(asset: MediaAsset): Promise<MediaAsset>;
  delete(id: string): Promise<void>;
}

export class MediaRepositoryError extends Error {
  constructor(message = "Media assets are temporarily unavailable.") {
    super(message);
    this.name = "MediaRepositoryError";
  }
}
