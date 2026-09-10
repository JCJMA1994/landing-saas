import {
  calculateBackoffDelayMs,
  type BackgroundJob,
  type JobType,
} from "../../domain/scale/job";
import type { EnqueueJobInput, JobRepository } from "./job-repository";

export type JobHandler<T = any> = (payload: T) => Promise<void>;

export interface ProcessStepResult {
  readonly processed: boolean;
  readonly jobId?: string | undefined;
  readonly success?: boolean | undefined;
  readonly error?: string | undefined;
  readonly retried?: boolean | undefined;
}

export async function enqueueBackgroundJobUseCase<T = Record<string, unknown>>(
  input: EnqueueJobInput<T>,
  repository: JobRepository
): Promise<BackgroundJob<T>> {
  return repository.enqueueJob(input);
}

export async function processJobWorkerStepUseCase(
  repository: JobRepository,
  handlers: Partial<Record<JobType, JobHandler>>
): Promise<ProcessStepResult> {
  const job = await repository.claimNextJob();
  if (!job) {
    return { processed: false };
  }

  const handler = handlers[job.jobType];
  if (!handler) {
    const err = `No worker handler registered for job type "${job.jobType}".`;
    await repository.failJob(job.id, err);
    return { processed: true, jobId: job.id, success: false, error: err };
  }

  try {
    await handler(job.payload);
    await repository.completeJob(job.id);
    return { processed: true, jobId: job.id, success: true };
  } catch (error: any) {
    const errorMsg = error?.message || String(error);
    const nextAttempt = job.attempts + 1;

    if (nextAttempt >= job.maxAttempts) {
      // Exceeded max retry attempts, permanently fail
      await repository.failJob(job.id, `Max retries exceeded: ${errorMsg}`);
      return { processed: true, jobId: job.id, success: false, error: errorMsg, retried: false };
    } else {
      // Schedule retry with exponential backoff
      const delayMs = calculateBackoffDelayMs(nextAttempt);
      const nextScheduledAt = new Date(Date.now() + delayMs).toISOString();
      await repository.failJob(job.id, errorMsg, nextScheduledAt);
      return { processed: true, jobId: job.id, success: false, error: errorMsg, retried: true };
    }
  }
}
