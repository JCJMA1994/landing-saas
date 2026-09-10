import { describe, expect, it } from "vitest";
import {
  ALLOWED_MEDIA_MIMES,
  buildStoragePath,
  isValidFileSize,
  isValidMimeType,
  MAX_MEDIA_FILE_SIZE,
  sanitizeFileName,
} from "../../src/domain/site/media";

describe("media assets domain", () => {
  it("enforces strict image MIME allowlist", () => {
    expect(ALLOWED_MEDIA_MIMES).toEqual(["image/jpeg", "image/png", "image/webp"]);
    expect(isValidMimeType("image/jpeg")).toBe(true);
    expect(isValidMimeType("image/png")).toBe(true);
    expect(isValidMimeType("image/webp")).toBe(true);

    // Disallowed
    expect(isValidMimeType("image/svg+xml")).toBe(false);
    expect(isValidMimeType("application/pdf")).toBe(false);
    expect(isValidMimeType("text/html")).toBe(false);
    expect(isValidMimeType("")).toBe(false);
  });

  it("enforces file size limits (5MB)", () => {
    expect(isValidFileSize(1024)).toBe(true);
    expect(isValidFileSize(MAX_MEDIA_FILE_SIZE)).toBe(true);

    expect(isValidFileSize(0)).toBe(false);
    expect(isValidFileSize(-100)).toBe(false);
    expect(isValidFileSize(MAX_MEDIA_FILE_SIZE + 1)).toBe(false);
  });

  it("sanitizes file names and formats storage path", () => {
    expect(sanitizeFileName("My Photo (1).PNG")).toBe("my-photo-1-.png");
    const path = buildStoragePath("tenant-1", "site-1", "Hero Banner.webp");
    expect(path).toMatch(/^tenant-1\/site-1\/\d+-hero-banner\.webp$/);
  });
});
