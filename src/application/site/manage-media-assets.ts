import type { VerifiedUser } from "../auth/admin-access";
import { canEditContent, type TenantRole } from "../../domain/tenant/roles";
import { SiteAuthorizationError } from "./manage-site-content";
import {
  buildStoragePath,
  isValidFileSize,
  isValidMimeType,
  type MediaAsset,
} from "../../domain/site/media";
import type { MediaRepository } from "./media-repository";
import type { StorageGateway } from "./storage-gateway";
import type { AuditLogGateway } from "../audit/audit-gateway";

export class InvalidMediaError extends Error {
  constructor(message = "Invalid media file provided.") {
    super(message);
    this.name = "InvalidMediaError";
  }
}

export async function listMediaAssetsUseCase(
  actor: VerifiedUser | null,
  siteId: string,
  repo: MediaRepository,
): Promise<MediaAsset[]> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  return repo.listBySite(siteId);
}

export async function uploadMediaAssetUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  siteId: string,
  input: {
    filename: string;
    mimeType: string;
    data: Uint8Array;
    altText: string;
  },
  actorRole: TenantRole,
  repo: MediaRepository,
  storage: StorageGateway,
  audit: AuditLogGateway,
): Promise<MediaAsset> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  if (!canEditContent(actorRole)) {
    throw new SiteAuthorizationError("Insufficient permissions to upload media.");
  }

  if (!isValidMimeType(input.mimeType)) {
    throw new InvalidMediaError("Unsupported file type. Only JPEG, PNG, and WebP images are allowed.");
  }

  const fileSizeBytes = input.data.byteLength;
  if (!isValidFileSize(fileSizeBytes)) {
    throw new InvalidMediaError("File size exceeds 5MB limit or is empty.");
  }

  const altText = input.altText.trim();
  if (altText.length === 0 || altText.length > 160) {
    throw new InvalidMediaError("Alt text must be between 1 and 160 characters.");
  }

  const filePath = buildStoragePath(tenantId, siteId, input.filename);

  // Upload to physical storage first
  await storage.uploadFile(filePath, input.data, input.mimeType);

  // Save metadata to database
  const asset = await repo.insert({
    tenantId,
    siteId,
    filePath,
    mimeType: input.mimeType,
    fileSizeBytes,
    altText,
  });

  // Audit event
  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: "media.uploaded",
    resourceType: "media_asset",
    resourceId: asset.id ?? filePath,
    metadata: {
      filePath,
      mimeType: input.mimeType,
      size: fileSizeBytes,
    },
  });

  return asset;
}

export async function deleteMediaAssetUseCase(
  actor: VerifiedUser | null,
  tenantId: string,
  siteId: string,
  assetId: string,
  actorRole: TenantRole,
  repo: MediaRepository,
  storage: StorageGateway,
  audit: AuditLogGateway,
): Promise<void> {
  if (!actor) throw new SiteAuthorizationError("Authentication required.");
  if (!canEditContent(actorRole)) {
    throw new SiteAuthorizationError("Insufficient permissions to delete media.");
  }

  const asset = await repo.getById(assetId);
  if (!asset || asset.siteId !== siteId) return;

  // Remove from database and storage
  await repo.delete(assetId);
  await storage.deleteFile(asset.filePath);

  // Audit event
  await audit.record({
    tenantId,
    actorUserId: actor.id,
    action: "media.deleted",
    resourceType: "media_asset",
    resourceId: assetId,
    metadata: {
      filePath: asset.filePath,
    },
  });
}
