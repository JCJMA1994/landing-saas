import type { SupabaseClient } from "@supabase/supabase-js";
import { isTenantRole, type TenantRole } from "../../domain/tenant/roles";
import {
  MemberRepositoryError,
  type MemberRepository,
  type TenantMember,
} from "../../application/members/member-repository";

export class SupabaseMemberRepository implements MemberRepository {
  constructor(private readonly client: SupabaseClient) {}

  async listMembers(tenantId: string): Promise<TenantMember[]> {
    try {
      const { data, error } = await this.client
        .from("tenant_members")
        .select("tenant_id, user_id, role, created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true });

      if (error || !Array.isArray(data)) throw new MemberRepositoryError();

      return data.map((row: Record<string, unknown>) => {
        if (
          typeof row["tenant_id"] !== "string" ||
          typeof row["user_id"] !== "string" ||
          !isTenantRole(row["role"]) ||
          typeof row["created_at"] !== "string"
        ) {
          throw new MemberRepositoryError();
        }
        return {
          tenantId: row["tenant_id"],
          userId: row["user_id"],
          role: row["role"],
          createdAt: row["created_at"],
        };
      });
    } catch {
      throw new MemberRepositoryError();
    }
  }

  async getMember(tenantId: string, userId: string): Promise<TenantMember | null> {
    try {
      const { data, error } = await this.client
        .from("tenant_members")
        .select("tenant_id, user_id, role, created_at")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle();

      if (error) throw new MemberRepositoryError();
      if (!data) return null;

      const record = data as Record<string, unknown>;
      if (
        typeof record["tenant_id"] !== "string" ||
        typeof record["user_id"] !== "string" ||
        !isTenantRole(record["role"]) ||
        typeof record["created_at"] !== "string"
      ) {
        throw new MemberRepositoryError();
      }

      return {
        tenantId: record["tenant_id"],
        userId: record["user_id"],
        role: record["role"],
        createdAt: record["created_at"],
      };
    } catch {
      throw new MemberRepositoryError();
    }
  }

  async countOwners(tenantId: string): Promise<number> {
    try {
      const { count, error } = await this.client
        .from("tenant_members")
        .select("*", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("role", "owner");

      if (error || count === null) throw new MemberRepositoryError();
      return count;
    } catch {
      throw new MemberRepositoryError();
    }
  }

  async upsertMember(member: { tenantId: string; userId: string; role: TenantRole }): Promise<void> {
    try {
      const { error } = await this.client
        .from("tenant_members")
        .upsert({
          tenant_id: member.tenantId,
          user_id: member.userId,
          role: member.role,
        });

      if (error) throw new MemberRepositoryError();
    } catch {
      throw new MemberRepositoryError();
    }
  }

  async removeMember(tenantId: string, userId: string): Promise<void> {
    try {
      const { error } = await this.client
        .from("tenant_members")
        .delete()
        .eq("tenant_id", tenantId)
        .eq("user_id", userId);

      if (error) throw new MemberRepositoryError();
    } catch {
      throw new MemberRepositoryError();
    }
  }
}
