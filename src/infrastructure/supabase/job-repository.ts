import type { SupabaseClient } from "@supabase/supabase-js";
import type { BackgroundJob, JobStatus, JobType } from "../../domain/scale/job";
import type { EnqueueJobInput, JobRepository } from "../../application/scale/job-repository";

interface DbJobRow {
  id: string;
  tenant_id: string | null;
  job_type: string;
  payload: any;
  status: string;
  attempts: number;
  max_attempts: number;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

function mapJob<T = Record<string, unknown>>(row: DbJobRow): BackgroundJob<T> {
  return {
    id: row.id,
    tenantId: row.tenant_id || undefined,
    jobType: row.job_type as JobType,
    payload: row.payload as T,
    status: row.status as JobStatus,
    attempts: row.attempts,
    maxAttempts: row.max_attempts,
    scheduledAt: row.scheduled_at,
    startedAt: row.started_at || undefined,
    completedAt: row.completed_at || undefined,
    errorMessage: row.error_message || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseJobRepository implements JobRepository {
  constructor(private readonly supabase: SupabaseClient) {}

  async enqueueJob<T = Record<string, unknown>>(input: EnqueueJobInput<T>): Promise<BackgroundJob<T>> {
    const payload = {
      tenant_id: input.tenantId || null,
      job_type: input.jobType,
      payload: input.payload,
      max_attempts: input.maxAttempts ?? 3,
      scheduled_at: input.scheduledAt || new Date().toISOString(),
      status: "pending",
    };

    const { data, error } = await this.supabase
      .from("background_jobs")
      .insert(payload)
      .select("*")
      .single();

    if (error || !data) {
      throw new Error(`Failed to enqueue background job: ${error?.message}`);
    }

    return mapJob<T>(data as DbJobRow);
  }

  async claimNextJob(): Promise<BackgroundJob | null> {
    const now = new Date().toISOString();

    // Select the oldest pending job that is ready to run
    const { data: candidate, error: fetchErr } = await this.supabase
      .from("background_jobs")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fetchErr || !candidate) {
      return null;
    }

    // Atomically transition candidate to processing
    const { data: claimed, error: claimErr } = await this.supabase
      .from("background_jobs")
      .update({
        status: "processing",
        started_at: now,
        attempts: candidate.attempts + 1,
        updated_at: now,
      })
      .eq("id", candidate.id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimErr || !claimed) {
      return null;
    }

    return mapJob(claimed as DbJobRow);
  }

  async completeJob(jobId: string): Promise<void> {
    const now = new Date().toISOString();
    await this.supabase
      .from("background_jobs")
      .update({
        status: "completed",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", jobId);
  }

  async failJob(jobId: string, error: string, nextScheduledAt?: string): Promise<void> {
    const now = new Date().toISOString();
    const isRetry = Boolean(nextScheduledAt);

    await this.supabase
      .from("background_jobs")
      .update({
        status: isRetry ? "pending" : "failed",
        error_message: error,
        scheduled_at: nextScheduledAt || now,
        updated_at: now,
      })
      .eq("id", jobId);
  }

  async listJobs(tenantId?: string, limit = 50): Promise<BackgroundJob[]> {
    let query = this.supabase
      .from("background_jobs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tenantId) {
      query = query.eq("tenant_id", tenantId);
    }

    const { data, error } = await query;
    if (error || !Array.isArray(data)) {
      return [];
    }

    return (data as DbJobRow[]).map(mapJob);
  }
}
