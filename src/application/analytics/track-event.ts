import {
  hashUserAgent,
  isValidEventName,
  type AnalyticsEventName,
  type SiteAnalyticsEvent,
} from "../../domain/analytics/event";
import type { AnalyticsRepository, AnalyticsSummary } from "./analytics-repository";
import type { TenantRole } from "../../domain/tenant/roles";

export class InvalidAnalyticsEventError extends Error {
  constructor(message = "Invalid analytics event payload.") {
    super(message);
    this.name = "InvalidAnalyticsEventError";
  }
}

export class AnalyticsAuthorizationError extends Error {
  constructor() {
    super("Insufficient permissions to view site analytics.");
    this.name = "AnalyticsAuthorizationError";
  }
}

export interface TrackEventInput {
  tenantId: string;
  siteId: string;
  eventName: string;
  path: string;
  referrer?: string | null | undefined;
  userAgent?: string | null | undefined;
  metadata?: Record<string, any> | undefined;
}

export async function trackAnalyticsEventUseCase(
  input: TrackEventInput,
  analyticsRepo: AnalyticsRepository
): Promise<void> {
  if (!isValidEventName(input.eventName)) {
    throw new InvalidAnalyticsEventError(`Unsupported event name: ${input.eventName}`);
  }

  if (!input.siteId || !input.tenantId || !input.path) {
    throw new InvalidAnalyticsEventError("siteId, tenantId, and path are required.");
  }

  const userAgentHash = hashUserAgent(input.userAgent);

  const event: SiteAnalyticsEvent = {
    tenantId: input.tenantId,
    siteId: input.siteId,
    eventName: input.eventName as AnalyticsEventName,
    path: input.path.slice(0, 255),
    referrer: input.referrer ? input.referrer.slice(0, 500) : null,
    userAgentHash,
    metadata: input.metadata || {},
  };

  await analyticsRepo.recordEvent(event);
}

export async function getSiteAnalyticsSummaryUseCase(
  siteId: string,
  role: TenantRole,
  analyticsRepo: AnalyticsRepository,
  days = 30
): Promise<AnalyticsSummary> {
  // Any member of the tenant can view analytics
  if (!role) {
    throw new AnalyticsAuthorizationError();
  }

  return await analyticsRepo.getSummary(siteId, days);
}
