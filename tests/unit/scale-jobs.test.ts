import { describe, expect, it, vi } from "vitest";
import { calculateBackoffDelayMs, isJobDue, type BackgroundJob } from "../../src/domain/scale/job";
import {
  enqueueBackgroundJobUseCase,
  processJobWorkerStepUseCase,
} from "../../src/application/scale/manage-jobs";
import type { EnqueueJobInput, JobRepository } from "../../src/application/scale/job-repository";

class InMemoryJobRepository implements JobRepository {
  public jobs: BackgroundJob[] = [];

  async enqueueJob<T = Record<string, unknown>>(input: EnqueueJobInput<T>): Promise<BackgroundJob<T>> {
    const job: BackgroundJob<T> = {
      id: `job-${this.jobs.length + 1}`,
      tenantId: input.tenantId,
      jobType: input.jobType,
      payload: input.payload,
      status: "pending",
      attempts: 0,
      maxAttempts: input.maxAttempts ?? 3,
      scheduledAt: input.scheduledAt || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.jobs.push(job as any);
    return job;
  }

  async claimNextJob(): Promise<BackgroundJob | null> {
    const job = this.jobs.find((j) => j.status === "pending" && isJobDue(j));
    if (!job) return null;

    const claimed: BackgroundJob = {
      ...job,
      status: "processing",
      attempts: job.attempts + 1,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const idx = this.jobs.findIndex((j) => j.id === job.id);
    this.jobs[idx] = claimed;
    return claimed;
  }

  async completeJob(jobId: string): Promise<void> {
    const idx = this.jobs.findIndex((j) => j.id === jobId);
    if (idx !== -1) {
      this.jobs[idx] = {
        ...this.jobs[idx]!,
        status: "completed",
        completedAt: new Date().toISOString(),
      };
    }
  }

  async failJob(jobId: string, error: string, nextScheduledAt?: string): Promise<void> {
    const idx = this.jobs.findIndex((j) => j.id === jobId);
    if (idx !== -1) {
      this.jobs[idx] = {
        ...this.jobs[idx]!,
        status: nextScheduledAt ? "pending" : "failed",
        errorMessage: error,
        scheduledAt: nextScheduledAt || this.jobs[idx]!.scheduledAt,
      };
    }
  }

  async listJobs(_tenantId?: string, _limit = 50): Promise<BackgroundJob[]> {
    return this.jobs;
  }
}

describe("Background Jobs Pipeline", () => {
  it("computes exponential backoff delays with caps", () => {
    expect(calculateBackoffDelayMs(0)).toBe(0);
    expect(calculateBackoffDelayMs(1, 1000)).toBe(1000);
    expect(calculateBackoffDelayMs(2, 1000)).toBe(2000);
    expect(calculateBackoffDelayMs(3, 1000)).toBe(4000);
    expect(calculateBackoffDelayMs(10, 1000, 30_000)).toBe(30_000); // Capped at maxDelay
  });

  it("enqueues and executes background jobs successfully", async () => {
    const repo = new InMemoryJobRepository();
    const handler = vi.fn().mockResolvedValue(undefined);

    const queued = await enqueueBackgroundJobUseCase(
      {
        jobType: "cdn_purge",
        payload: { siteId: "site-1", paths: ["/"] },
      },
      repo
    );

    expect(queued.status).toBe("pending");

    const result = await processJobWorkerStepUseCase(repo, {
      cdn_purge: handler,
    });

    expect(result.processed).toBe(true);
    expect(result.success).toBe(true);
    expect(handler).toHaveBeenCalledWith({ siteId: "site-1", paths: ["/"] });

    const job = (await repo.listJobs())[0];
    expect(job?.status).toBe("completed");
  });

  it("schedules retry with backoff on handler failure", async () => {
    const repo = new InMemoryJobRepository();
    const failingHandler = vi.fn().mockRejectedValue(new Error("Connection timeout"));

    await enqueueBackgroundJobUseCase(
      {
        jobType: "billing_sync",
        payload: { tenantId: "t-1" },
        maxAttempts: 3,
      },
      repo
    );

    // Attempt 1: should retry
    const result1 = await processJobWorkerStepUseCase(repo, {
      billing_sync: failingHandler,
    });

    expect(result1.processed).toBe(true);
    expect(result1.success).toBe(false);
    expect(result1.retried).toBe(true);

    const jobAfterAttempt1 = (await repo.listJobs())[0];
    expect(jobAfterAttempt1?.status).toBe("pending");
    expect(jobAfterAttempt1?.attempts).toBe(1);
  });

  it("permanently fails job when max attempts are exhausted", async () => {
    const repo = new InMemoryJobRepository();
    const failingHandler = vi.fn().mockRejectedValue(new Error("Fatal error"));

    await enqueueBackgroundJobUseCase(
      {
        jobType: "webhook_dispatch",
        payload: {},
        maxAttempts: 1, // Only 1 attempt allowed
      },
      repo
    );

    const result = await processJobWorkerStepUseCase(repo, {
      webhook_dispatch: failingHandler,
    });

    expect(result.processed).toBe(true);
    expect(result.success).toBe(false);
    expect(result.retried).toBe(false);

    const job = (await repo.listJobs())[0];
    expect(job?.status).toBe("failed");
    expect(job?.errorMessage).toContain("Max retries exceeded");
  });
});
