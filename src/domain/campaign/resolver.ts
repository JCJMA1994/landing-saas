import type { SiteCampaign } from "./campaign";

export interface CampaignResolutionResult {
  activeCampaign: SiteCampaign | null;
  resolvedAt: string; // ISO 8601
  isSimulated: boolean;
}

/**
 * Deterministically resolves the single winning campaign for a given target timestamp.
 *
 * Rules:
 * 1. Must have status 'active' or 'scheduled'.
 * 2. Target date must fall within [startsAt, endsAt] inclusive.
 * 3. Highest priority wins.
 * 4. Ties broken by most recent startsAt timestamp.
 * 5. Further ties broken deterministically by campaign id.
 * 6. Returns null if no matching campaign is found (graceful fallback to base theme).
 */
export function resolveActiveCampaign(
  campaigns: SiteCampaign[],
  targetDate: Date = new Date()
): SiteCampaign | null {
  const targetTime = targetDate.getTime();
  if (isNaN(targetTime)) return null;

  const eligible = campaigns.filter((c) => {
    if (c.status !== "active" && c.status !== "scheduled") {
      return false;
    }

    const startTime = new Date(c.startsAt).getTime();
    const endTime = new Date(c.endsAt).getTime();

    if (isNaN(startTime) || isNaN(endTime)) return false;

    return targetTime >= startTime && targetTime <= endTime;
  });

  if (eligible.length === 0) {
    return null;
  }

  // Deterministic sorting
  eligible.sort((a, b) => {
    // 1. Priority descending
    if (b.priority !== a.priority) {
      return b.priority - a.priority;
    }

    // 2. StartsAt descending (most recent campaign first)
    const timeA = new Date(a.startsAt).getTime();
    const timeB = new Date(b.startsAt).getTime();
    if (timeB !== timeA) {
      return timeB - timeA;
    }

    // 3. Deterministic tie-breaker by id
    return b.id.localeCompare(a.id);
  });

  return eligible[0] ?? null;
}
