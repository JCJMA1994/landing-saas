import type { SupabaseClient } from "@supabase/supabase-js";
import {
  AuditGatewayError,
  type AuditLogEntry,
  type AuditLogGateway,
} from "../../application/audit/audit-gateway";

export class SupabaseAuditGateway implements AuditLogGateway {
  constructor(private readonly client: SupabaseClient) {}

  async record(entry: AuditLogEntry): Promise<void> {
    try {
      const { error } = await this.client.from("audit_log").insert({
        tenant_id: entry.tenantId,
        actor_user_id: entry.actorUserId,
        action: entry.action,
        resource_type: entry.resourceType,
        resource_id: entry.resourceId,
        metadata: entry.metadata ?? {},
      });

      if (error) throw new AuditGatewayError();
    } catch {
      throw new AuditGatewayError();
    }
  }

  async listRecent(tenantId: string, limit = 50): Promise<AuditLogEntry[]> {
    try {
      const { data, error } = await this.client
        .from("audit_log")
        .select("tenant_id, actor_user_id, action, resource_type, resource_id, metadata, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error || !Array.isArray(data)) throw new AuditGatewayError();

      return data.map((row: Record<string, unknown>) => {
        if (
          typeof row["tenant_id"] !== "string" ||
          typeof row["actor_user_id"] !== "string" ||
          typeof row["action"] !== "string" ||
          typeof row["resource_type"] !== "string" ||
          typeof row["resource_id"] !== "string"
        ) {
          throw new AuditGatewayError();
        }

        return {
          tenantId: row["tenant_id"],
          actorUserId: row["actor_user_id"],
          action: row["action"],
          resourceType: row["resource_type"],
          resourceId: row["resource_id"],
          metadata: (row["metadata"] as Record<string, unknown>) ?? {},
          createdAt: typeof row["created_at"] === "string" ? row["created_at"] : undefined,
        };
      });
    } catch {
      throw new AuditGatewayError();
    }
  }
}
