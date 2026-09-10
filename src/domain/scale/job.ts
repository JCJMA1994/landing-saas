export const JOB_TYPES = [
  "cdn_purge",
  "analytics_aggregate",
  "webhook_dispatch",
  "billing_sync",
] as const;

export type JobType = (typeof JOB_TYPES)[number];

export const JOB_STATUSES = ["pending", "processing", "completed", "failed"] as const;
export type JobStatus = (typeof JOB_STATUSES)[number];

export interface BackgroundJob<T = Record<string, unknown>> {
  readonly id: string;
  readonly tenantId?: string | undefined;
  readonly jobType: JobType;
  readonly payload: T;
  readonly status: JobStatus;
  readonly attempts: number;
  readonly maxAttempts: number;
  readonly scheduledAt: string;
  readonly startedAt?: string | undefined;
  readonly completedAt?: string | undefined;
  readonly errorMessage?: string | undefined;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export function calculateBackoffDelayMs(
  attempt: number,
  baseDelayMs = 1000,
  maxDelayMs = 60_000
): number {
  if (attempt <= 0) return 0;
  const exponential = baseDelayMs * Math.pow(2, attempt - 1);
  return Math.min(exponential, maxDelayMs);
}

export function isJobDue(job: BackgroundJob, now = new Date()): boolean {
  if (job.status !== "pending") return false;
  return new Date(job.scheduledAt).getTime() <= now.getTime();
}
