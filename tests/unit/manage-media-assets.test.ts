import { describe, expect, it, vi } from "vitest";
import {
  deleteMediaAssetUseCase,
  listMediaAssetsUseCase,
  uploadMediaAssetUseCase,
  InvalidMediaError,
} from "../../src/application/site/manage-media-assets";
import { SiteAuthorizationError } from "../../src/application/site/manage-site-content";
import type { MediaRepository } from "../../src/application/site/media-repository";
import type { StorageGateway } from "../../src/application/site/storage-gateway";
import type { AuditLogGateway } from "../../src/application/audit/audit-gateway";
import type { MediaAsset } from "../../src/domain/site/media";

const mockSiteId = "20000000-0000-0000-0000-000000000003";
const mockTenantId = "10000000-0000-0000-0000-000000000003";
const editorUser = { id: "00000000-0000-0000-0000-000000000001" };

function createMockMediaRepo(): MediaRepository {
  return {
    listBySite: vi.fn().mockResolvedValue([]),
    getById: vi.fn().mockImplementation(async (id: string) => ({
      id,
      tenantId: mockTenantId,
      siteId: mockSiteId,
      filePath: `${mockTenantId}/${mockSiteId}/test.webp`,
      mimeType: "image/webp",
      fileSizeBytes: 2048,
      altText: "Existing asset",
    })),
    insert: vi.fn().mockImplementation(async (asset: MediaAsset) => ({
      ...asset,
      id: "media-new-id",
    })),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

function createMockStorage(): StorageGateway {
  return {
    uploadFile: vi.fn().mockResolvedValue(undefined),
    deleteFile: vi.fn().mockResolvedValue(undefined),
    getUrl: vi.fn().mockReturnValue("https://storage.example.com/asset.webp"),
  };
}

function createMockAudit(): AuditLogGateway {
  return {
    record: vi.fn().mockResolvedValue(undefined),
    listRecent: vi.fn().mockResolvedValue([]),
  };
}

describe("manage media assets use cases", () => {
  it("rejects unauthenticated listBySite", async () => {
    const repo = createMockMediaRepo();
    await expect(listMediaAssetsUseCase(null, mockSiteId, repo)).rejects.toThrow(SiteAuthorizationError);
  });

  it("prevents viewers from uploading media", async () => {
    const repo = createMockMediaRepo();
    const storage = createMockStorage();
    const audit = createMockAudit();

    await expect(
      uploadMediaAssetUseCase(
        editorUser,
        mockTenantId,
        mockSiteId,
        {
          filename: "test.png",
          mimeType: "image/png",
          data: new Uint8Array([1, 2, 3]),
          altText: "Test image",
        },
        "viewer",
        repo,
        storage,
        audit,
      ),
    ).rejects.toThrow(SiteAuthorizationError);
  });

  it("rejects disallowed SVG mime type", async () => {
    const repo = createMockMediaRepo();
    const storage = createMockStorage();
    const audit = createMockAudit();

    await expect(
      uploadMediaAssetUseCase(
        editorUser,
        mockTenantId,
        mockSiteId,
        {
          filename: "logo.svg",
          mimeType: "image/svg+xml",
          data: new Uint8Array([1, 2, 3]),
          altText: "Logo",
        },
        "editor",
        repo,
        storage,
        audit,
      ),
    ).rejects.toThrow(InvalidMediaError);
  });

  it("uploads valid image, stores metadata and records audit log", async () => {
    const repo = createMockMediaRepo();
    const storage = createMockStorage();
    const audit = createMockAudit();

    const result = await uploadMediaAssetUseCase(
      editorUser,
      mockTenantId,
      mockSiteId,
      {
        filename: "hero.webp",
        mimeType: "image/webp",
        data: new Uint8Array([1, 2, 3, 4]),
        altText: "Hero main graphic",
      },
      "editor",
      repo,
      storage,
      audit,
    );

    expect(storage.uploadFile).toHaveBeenCalled();
    expect(repo.insert).toHaveBeenCalled();
    expect(result.id).toBe("media-new-id");
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: mockTenantId,
        action: "media.uploaded",
        actorUserId: editorUser.id,
      }),
    );
  });

  it("deletes media asset from storage, database, and logs audit event", async () => {
    const repo = createMockMediaRepo();
    const storage = createMockStorage();
    const audit = createMockAudit();

    await deleteMediaAssetUseCase(
      editorUser,
      mockTenantId,
      mockSiteId,
      "media-123",
      "admin",
      repo,
      storage,
      audit,
    );

    expect(repo.delete).toHaveBeenCalledWith("media-123");
    expect(storage.deleteFile).toHaveBeenCalledWith(`${mockTenantId}/${mockSiteId}/test.webp`);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: mockTenantId,
        action: "media.deleted",
        resourceId: "media-123",
      }),
    );
  });
});
