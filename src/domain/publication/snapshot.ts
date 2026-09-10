import type { SiteTheme } from "../site/theme";
import type { SiteHero } from "../site/hero";
import type { SiteCard } from "../site/card";
import type { SitePromotion } from "../site/promotion";
import type { SiteContacts } from "../site/contact";
import {
  getTemplateManifest,
  isTemplateKey,
  type TemplateKey,
} from "../template/manifest";

export interface PublicationSnapshot {
  schemaVersion: number;
  siteId: string;
  siteName: string;
  siteSlug: string;
  templateKey: TemplateKey;
  templateVersion: number;
  theme: SiteTheme;
  hero: SiteHero | null;
  cards: SiteCard[];
  promotions: SitePromotion[];
  contacts: SiteContacts | null;
  publishedAt: string;
}

export interface CreateSnapshotInput {
  siteId: string;
  siteName: string;
  siteSlug: string;
  templateKey: TemplateKey;
  theme: SiteTheme;
  hero: SiteHero | null;
  cards: SiteCard[];
  promotions: SitePromotion[];
  contacts: SiteContacts | null;
  publishedAt?: string | undefined;
}

export function createPublicationSnapshot(input: CreateSnapshotInput): PublicationSnapshot {
  const manifest = getTemplateManifest(input.templateKey);

  return {
    schemaVersion: 1,
    siteId: input.siteId,
    siteName: input.siteName,
    siteSlug: input.siteSlug,
    templateKey: input.templateKey,
    templateVersion: manifest.version,
    theme: input.theme,
    hero: input.hero,
    cards: [...input.cards].sort((a, b) => a.sortOrder - b.sortOrder),
    promotions: [...input.promotions],
    contacts: input.contacts,
    publishedAt: input.publishedAt || new Date().toISOString(),
  };
}

/**
 * Deterministically sorts object keys for consistent JSON representation and hash checksums
 */
export function canonicalizeJson(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map(canonicalizeJson).join(",")}]`;
  }

  const record = value as Record<string, unknown>;
  const sortedKeys = Object.keys(record).sort();
  const entries = sortedKeys.map(
    (key) => `${JSON.stringify(key)}:${canonicalizeJson(record[key])}`
  );

  return `{${entries.join(",")}}`;
}

/**
 * Computes a deterministic SHA-256 checksum hex string for a publication snapshot
 */
export async function calculateSnapshotChecksum(snapshot: PublicationSnapshot): Promise<string> {
  const canonical = canonicalizeJson(snapshot);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonical);

  // Use standard Web Crypto API supported in both browser and Node.js
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export class InvalidSnapshotError extends Error {
  constructor(message: string) {
    super(`Invalid publication snapshot: ${message}`);
    this.name = "InvalidSnapshotError";
  }
}

export function validatePublicationSnapshot(raw: unknown): PublicationSnapshot {
  if (!raw || typeof raw !== "object") {
    throw new InvalidSnapshotError("Snapshot must be a valid object.");
  }

  const s = raw as Record<string, unknown>;

  if (typeof s["schemaVersion"] !== "number" || s["schemaVersion"] < 1) {
    throw new InvalidSnapshotError("Invalid schemaVersion.");
  }
  if (typeof s["siteId"] !== "string" || !s["siteId"]) {
    throw new InvalidSnapshotError("Missing or invalid siteId.");
  }
  if (typeof s["siteName"] !== "string") {
    throw new InvalidSnapshotError("Missing siteName.");
  }
  if (typeof s["siteSlug"] !== "string") {
    throw new InvalidSnapshotError("Missing siteSlug.");
  }
  if (typeof s["templateKey"] !== "string" || !isTemplateKey(s["templateKey"])) {
    throw new InvalidSnapshotError("Invalid or unsupported templateKey.");
  }
  if (!s["theme"] || typeof s["theme"] !== "object") {
    throw new InvalidSnapshotError("Missing theme in snapshot.");
  }
  if (!Array.isArray(s["cards"])) {
    throw new InvalidSnapshotError("Cards must be an array.");
  }
  if (!Array.isArray(s["promotions"])) {
    throw new InvalidSnapshotError("Promotions must be an array.");
  }
  if (typeof s["publishedAt"] !== "string") {
    throw new InvalidSnapshotError("Missing publishedAt timestamp.");
  }

  return s as unknown as PublicationSnapshot;
}
