export const ALLOWED_MEDIA_MIMES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedMediaMime = (typeof ALLOWED_MEDIA_MIMES)[number];

export const MAX_MEDIA_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export interface MediaAsset {
  id?: string | undefined;
  tenantId: string;
  siteId: string;
  filePath: string;
  mimeType: AllowedMediaMime;
  fileSizeBytes: number;
  altText: string;
  createdAt?: string | undefined;
}

export function isValidMimeType(mime: string): mime is AllowedMediaMime {
  return (ALLOWED_MEDIA_MIMES as readonly string[]).includes(mime);
}

export function isValidFileSize(bytes: number): boolean {
  return bytes > 0 && bytes <= MAX_MEDIA_FILE_SIZE;
}

export function sanitizeFileName(name: string): string {
  const clean = name.toLowerCase().replace(/[^a-z0-9._-]/g, "-");
  return clean.replace(/-+/g, "-");
}

export function buildStoragePath(tenantId: string, siteId: string, filename: string): string {
  return `${tenantId}/${siteId}/${Date.now()}-${sanitizeFileName(filename)}`;
}
