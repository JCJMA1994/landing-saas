import { createHash } from "node:crypto";

export const ANALYTICS_EVENT_NAMES = [
  "page_view",
  "cta_click",
  "whatsapp_click",
  "contact_submit",
  "campaign_view",
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

export function isValidEventName(value: unknown): value is AnalyticsEventName {
  return typeof value === "string" && (ANALYTICS_EVENT_NAMES as readonly string[]).includes(value);
}

export interface SiteAnalyticsEvent {
  id?: string | undefined;
  tenantId: string;
  siteId: string;
  eventName: AnalyticsEventName;
  path: string;
  referrer?: string | null | undefined;
  userAgentHash?: string | null | undefined;
  metadata?: Record<string, any> | undefined;
  createdAt?: string | undefined;
}

/**
 * Creates an irreversible, pseudonymous SHA-256 hash from user-agent and daily date salt.
 * Ensures zero storage of personal identifiers or raw user agents.
 */
export function hashUserAgent(
  userAgent: string | null | undefined,
  saltDate = new Date().toISOString().slice(0, 10)
): string {
  const content = `${userAgent || "unknown-ua"}:${saltDate}`;
  return createHash("sha256").update(content).digest("hex").slice(0, 32);
}
