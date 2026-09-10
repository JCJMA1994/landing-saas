import type { BackgroundJob, JobType } from "../../domain/scale/job";

export interface EnqueueJobInput<T = Record<string, unknown>> {
  readonly tenantId?: string | undefined;
  readonly jobType: JobType;
  readonly payload: T;
  readonly maxAttempts?: number | undefined;
  readonly scheduledAt?: string | undefined;
}

export interface JobRepository {
  enqueueJob<T = Record<string, unknown>>(input: EnqueueJobInput<T>): Promise<BackgroundJob<T>>;
  claimNextJob(): Promise<BackgroundJob | null>;
  completeJob(jobId: string): Promise<void>;
  failJob(jobId: string, error: string, nextScheduledAt?: string): Promise<void>;
  listJobs(tenantId?: string, limit?: number): Promise<BackgroundJob[]>;
}
